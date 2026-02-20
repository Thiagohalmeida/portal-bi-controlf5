import { NextRequest, NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";
import { metadados } from "@/data/metadados";

export const runtime = "nodejs";

type CatalogRow = {
  area: string;
  datasetId: string;
  datasetLabel: string;
  tableId: string;
  tableLabel: string;
  tableDescription: string;
  enabled: boolean;
};

const projectId = process.env.BQ_PROJECT_ID || "worlddata-439415";
const location = process.env.BQ_LOCATION || "US";
const clientEmail = process.env.BQ_CLIENT_EMAIL;
const privateKey = (process.env.BQ_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
const configDataset = process.env.BQ_CONFIG_DATASET || "config";
const configTable = process.env.BQ_CONFIG_TABLE || "tabelas_visiveis";
const configTableFqn = `\`${projectId}.${configDataset}.${configTable}\``;

const bq = new BigQuery({
  projectId,
  credentials:
    clientEmail && privateKey
      ? {
          client_email: clientEmail,
          private_key: privateKey,
        }
      : undefined,
});

function isSafeIdentifier(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

function formatLabel(raw: string): string {
  return raw
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function fallbackArea(datasetId: string): string {
  return metadados.find((m) => m.dataset === datasetId)?.area || "Geral";
}

async function ensureConfigTableShape() {
  await bq.query({
    query: `
CREATE TABLE IF NOT EXISTS ${configTableFqn} (
  dataset_id STRING,
  table_id STRING,
  table_label STRING,
  enabled BOOL
)
`.trim(),
    location,
  });

  const alterStatements = [
    `ALTER TABLE ${configTableFqn} ADD COLUMN IF NOT EXISTS dataset_label STRING`,
    `ALTER TABLE ${configTableFqn} ADD COLUMN IF NOT EXISTS area STRING`,
    `ALTER TABLE ${configTableFqn} ADD COLUMN IF NOT EXISTS table_description STRING`,
  ];

  for (const query of alterStatements) {
    await bq.query({ query, location });
  }
}

async function loadConfigRows(): Promise<CatalogRow[]> {
  const [rows] = await bq.query({
    query: `
SELECT
  dataset_id,
  table_id,
  COALESCE(table_label, INITCAP(REPLACE(table_id, "_", " "))) AS table_label,
  COALESCE(dataset_label, INITCAP(REPLACE(dataset_id, "_", " "))) AS dataset_label,
  COALESCE(area, "Geral") AS area,
  COALESCE(table_description, "") AS table_description,
  COALESCE(enabled, FALSE) AS enabled
FROM ${configTableFqn}
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY dataset_id, table_id
  ORDER BY COALESCE(enabled, FALSE) DESC, table_label DESC
) = 1
`.trim(),
    location,
  });

  return (rows as any[]).map((row) => ({
    area: String(row.area || "Geral"),
    datasetId: String(row.dataset_id),
    datasetLabel: String(row.dataset_label || formatLabel(String(row.dataset_id))),
    tableId: String(row.table_id),
    tableLabel: String(row.table_label || formatLabel(String(row.table_id))),
    tableDescription: String(row.table_description || ""),
    enabled: Boolean(row.enabled),
  }));
}

async function discoverTables(): Promise<CatalogRow[]> {
  const [datasets] = await bq.getDatasets();

  const perDataset = await Promise.all(
    datasets.map(async (dataset) => {
      const datasetId = dataset.id || dataset.metadata?.datasetReference?.datasetId;
      if (!datasetId || datasetId.startsWith("_") || datasetId === configDataset) {
        return [];
      }

      try {
        const [tables] = await dataset.getTables();
        return tables
          .map((table) => {
            const tableId = table.id || table.metadata?.tableReference?.tableId;
            if (!tableId) return null;

            return {
              area: fallbackArea(datasetId),
              datasetId,
              datasetLabel: formatLabel(datasetId),
              tableId,
              tableLabel: formatLabel(tableId),
              tableDescription: "",
              enabled: false,
            } satisfies CatalogRow;
          })
          .filter(Boolean) as CatalogRow[];
      } catch {
        return [];
      }
    })
  );

  return perDataset.flat();
}

function mergeDiscoveredWithConfig(
  discoveredRows: CatalogRow[],
  configuredRows: CatalogRow[]
): CatalogRow[] {
  const mergedMap = new Map<string, CatalogRow>();
  const keyOf = (row: Pick<CatalogRow, "datasetId" | "tableId">) =>
    `${row.datasetId}.${row.tableId}`;

  for (const row of discoveredRows) {
    mergedMap.set(keyOf(row), row);
  }

  for (const row of configuredRows) {
    const key = keyOf(row);
    const base = mergedMap.get(key);

    mergedMap.set(key, {
      area: row.area || base?.area || "Geral",
      datasetId: row.datasetId,
      datasetLabel: row.datasetLabel || base?.datasetLabel || formatLabel(row.datasetId),
      tableId: row.tableId,
      tableLabel: row.tableLabel || base?.tableLabel || formatLabel(row.tableId),
      tableDescription: row.tableDescription || base?.tableDescription || "",
      enabled: row.enabled,
    });
  }

  return [...mergedMap.values()].sort((a, b) => {
    const byArea = a.area.localeCompare(b.area);
    if (byArea !== 0) return byArea;
    const byDataset = a.datasetLabel.localeCompare(b.datasetLabel);
    if (byDataset !== 0) return byDataset;
    return a.tableLabel.localeCompare(b.tableLabel);
  });
}

export async function GET(req: NextRequest) {
  try {
    await ensureConfigTableShape();
    const mode = req.nextUrl.searchParams.get("mode");

    if (mode === "public") {
      const [rows] = await bq.query({
        query: `
SELECT
  COALESCE(area, "Geral") AS area,
  dataset_id,
  COALESCE(dataset_label, INITCAP(REPLACE(dataset_id, "_", " "))) AS dataset_label,
  table_id,
  COALESCE(table_label, INITCAP(REPLACE(table_id, "_", " "))) AS table_label,
  COALESCE(table_description, "") AS table_description,
  COALESCE(enabled, FALSE) AS enabled
FROM ${configTableFqn}
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY dataset_id, table_id
  ORDER BY COALESCE(enabled, FALSE) DESC, table_label DESC
) = 1
AND COALESCE(enabled, FALSE) = TRUE
ORDER BY area, dataset_label, table_label
`.trim(),
        location,
      });

      const publicRows: CatalogRow[] = (rows as any[]).map((row) => ({
        area: String(row.area || "Geral"),
        datasetId: String(row.dataset_id),
        datasetLabel: String(row.dataset_label || formatLabel(String(row.dataset_id))),
        tableId: String(row.table_id),
        tableLabel: String(row.table_label || formatLabel(String(row.table_id))),
        tableDescription: String(row.table_description || ""),
        enabled: Boolean(row.enabled),
      }));

      return NextResponse.json({ projectId, rows: publicRows });
    }

    const [configuredRows, discoveredRows] = await Promise.all([
      loadConfigRows(),
      discoverTables(),
    ]);

    return NextResponse.json({
      projectId,
      rows: mergeDiscoveredWithConfig(discoveredRows, configuredRows),
    });
  } catch (err: any) {
    console.error("Catalog GET error:", err?.message, err?.stack);
    return NextResponse.json(
      { error: "Erro ao carregar catalogo do BigQuery." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureConfigTableShape();
    const body = await req.json().catch(() => ({}));

    const datasetId = String(body?.datasetId || "");
    const tableId = String(body?.tableId || "");
    const datasetLabel = String(body?.datasetLabel || formatLabel(datasetId));
    const tableLabel = String(body?.tableLabel || formatLabel(tableId));
    const tableDescription = String(body?.tableDescription || "");
    const area = String(body?.area || fallbackArea(datasetId));
    const enabled = Boolean(body?.enabled);

    if (!datasetId || !tableId) {
      return NextResponse.json(
        { error: "Parametros obrigatorios: datasetId, tableId" },
        { status: 400 }
      );
    }

    if (!isSafeIdentifier(datasetId) || !isSafeIdentifier(tableId)) {
      return NextResponse.json(
        { error: "Identificador invalido de dataset/tabela." },
        { status: 400 }
      );
    }

    await bq.query({
      query: `
BEGIN TRANSACTION;
DELETE FROM ${configTableFqn}
WHERE dataset_id = @dataset_id AND table_id = @table_id;

INSERT INTO ${configTableFqn} (
  dataset_id,
  table_id,
  table_label,
  enabled,
  dataset_label,
  area,
  table_description
)
VALUES (
  @dataset_id,
  @table_id,
  @table_label,
  @enabled,
  @dataset_label,
  @area,
  @table_description
);

UPDATE ${configTableFqn}
SET dataset_label = @dataset_label, area = @area
WHERE dataset_id = @dataset_id;
COMMIT TRANSACTION;
`.trim(),
      params: {
        dataset_id: datasetId,
        table_id: tableId,
        table_label: tableLabel,
        enabled,
        dataset_label: datasetLabel,
        area,
        table_description: tableDescription,
      },
      location,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Catalog POST error:", err?.message, err?.stack);
    return NextResponse.json(
      { error: "Erro ao salvar configuracao do catalogo." },
      { status: 500 }
    );
  }
}
