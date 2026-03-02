import { NextRequest, NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";
import { metadados } from "@/data/metadados";
import { getFieldDescriptionOverride } from "@/data/fieldDescriptions";

export const runtime = "nodejs";

type TableField = {
  nome: string;
  tipo: string;
  descricao: string | null;
};

type TableMetadataResult = {
  fields: TableField[];
  dateFields: string[];
  defaultDateField: string;
  tableDescription: string;
};

type CatalogRow = {
  area: string;
  datasetId: string;
  datasetLabel: string;
  tableId: string;
  tableLabel: string;
  tableDescription: string;
  enabled: boolean;
};

type SchemaExportRow = {
  area: string;
  datasetId: string;
  datasetLabel: string;
  tableId: string;
  tableLabel: string;
  tableDescription: string;
  fields: TableField[];
  dateFields: string[];
  defaultDateField: string;
  latestDate: string | null;
  error?: string;
};

const projectId = process.env.BQ_PROJECT_ID || "worlddata-439415";
const clientEmail = process.env.BQ_CLIENT_EMAIL;
const privateKey = (process.env.BQ_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
const configDataset = process.env.BQ_CONFIG_DATASET || "config";
const configTable = process.env.BQ_CONFIG_TABLE || "tabelas_visiveis";
const configTableFqn = `\`${projectId}.${configDataset}.${configTable}\``;

if (!projectId || !clientEmail || !privateKey) {
  console.error("BigQuery ENV missing:", {
    hasProjectId: !!projectId,
    hasClientEmail: !!clientEmail,
    hasPrivateKey: !!privateKey,
  });
}

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

function isDateType(type: string): boolean {
  return ["DATE", "DATETIME", "TIMESTAMP"].includes(type.toUpperCase());
}

function defaultDate(offsetDays: number): string {
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return base.toISOString().slice(0, 10);
}

function clampLimit(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? "10"), 10);
  if (Number.isNaN(parsed)) return 10;
  return Math.min(50, Math.max(10, parsed));
}

function extractDateValue(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && value && "value" in value) {
    return String((value as { value: unknown }).value);
  }
  return String(value);
}

function getTableConfig(dataset: string, tabela: string) {
  const ds = metadados.find((item) => item.dataset === dataset);
  return ds?.tabelas.find((t) => t.nome === tabela);
}

function pickDefaultDateField(dateFields: string[], preferred?: string): string {
  if (preferred && dateFields.includes(preferred)) return preferred;

  const exactData = dateFields.find((f) => f.toLowerCase() === "data");
  if (exactData) return exactData;

  const byKeyword = dateFields.find((f) => /(data|date)/i.test(f));
  if (byKeyword) return byKeyword;

  return dateFields[0] ?? "";
}

function normalizeBqType(type: string): string {
  const raw = String(type || "STRING")
    .toUpperCase()
    .split("(")[0]
    .trim();

  if (raw === "INTEGER") return "INT64";
  if (raw === "FLOAT") return "FLOAT64";
  if (raw === "BOOLEAN") return "BOOL";
  if (raw === "RECORD" || raw === "STRUCT" || raw === "ARRAY" || raw === "JSON") {
    return "STRING";
  }

  const supported = new Set([
    "STRING",
    "INT64",
    "FLOAT64",
    "NUMERIC",
    "BIGNUMERIC",
    "BOOL",
    "DATE",
    "DATETIME",
    "TIMESTAMP",
    "BYTES",
    "GEOGRAPHY",
  ]);

  return supported.has(raw) ? raw : "STRING";
}

function resolveMergedType(a: string, b: string): string {
  if (a === b) return a;
  if (a === "STRING" || b === "STRING") return "STRING";

  const numeric = new Set(["INT64", "NUMERIC", "BIGNUMERIC", "FLOAT64"]);
  if (numeric.has(a) && numeric.has(b)) {
    if (a === "FLOAT64" || b === "FLOAT64") return "FLOAT64";
    if (a === "BIGNUMERIC" || b === "BIGNUMERIC") return "BIGNUMERIC";
    if (a === "NUMERIC" || b === "NUMERIC") return "NUMERIC";
    return "INT64";
  }

  const temporal = new Set(["DATE", "DATETIME", "TIMESTAMP"]);
  if (temporal.has(a) && temporal.has(b)) {
    if (a === "TIMESTAMP" || b === "TIMESTAMP") return "TIMESTAMP";
    if (a === "DATETIME" || b === "DATETIME") return "DATETIME";
    return "DATE";
  }

  if (a === "BOOL" && b === "BOOL") return "BOOL";
  if (a === "BYTES" && b === "BYTES") return "BYTES";
  if (a === "GEOGRAPHY" && b === "GEOGRAPHY") return "GEOGRAPHY";

  return "STRING";
}

function quoteIdentifier(value: string): string {
  return `\`${String(value).replace(/`/g, "")}\``;
}

function quoteLiteral(value: string): string {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function isComplexSourceType(type: string): boolean {
  const raw = String(type || "").toUpperCase();
  return raw === "RECORD" || raw === "STRUCT" || raw === "ARRAY" || raw === "JSON";
}

async function ensureCatalogTableShape(location: string) {
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

async function loadEnabledCatalogRows(location: string): Promise<CatalogRow[]> {
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

  return (rows as any[]).map((row) => ({
    area: String(row.area || "Geral"),
    datasetId: String(row.dataset_id || ""),
    datasetLabel: String(row.dataset_label || row.dataset_id || ""),
    tableId: String(row.table_id || ""),
    tableLabel: String(row.table_label || row.table_id || ""),
    tableDescription: String(row.table_description || ""),
    enabled: Boolean(row.enabled),
  }));
}

function buildConsolidationArtifacts(schemas: SchemaExportRow[]) {
  const successfulSchemas = schemas.filter((row) => !row.error);
  const columnMap = new Map<string, string>();
  const sourceCountByColumn = new Map<string, number>();

  for (const row of successfulSchemas) {
    const seenInTable = new Set<string>();
    for (const field of row.fields) {
      const nome = String(field.nome || "").trim();
      if (!nome) continue;

      const normalizedType = normalizeBqType(field.tipo);
      const currentType = columnMap.get(nome);
      if (!currentType) {
        columnMap.set(nome, normalizedType);
      } else {
        columnMap.set(nome, resolveMergedType(currentType, normalizedType));
      }

      if (!seenInTable.has(nome)) {
        sourceCountByColumn.set(nome, (sourceCountByColumn.get(nome) ?? 0) + 1);
        seenInTable.add(nome);
      }
    }
  }

  const consolidatedFields = [...columnMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([nome, tipo]) => ({
      nome,
      tipo,
      sourceCount: sourceCountByColumn.get(nome) ?? 0,
    }));

  const unionSelects: string[] = successfulSchemas.map((row) => {
    const sourceTypeMap = new Map<string, string>();
    row.fields.forEach((field) => {
      sourceTypeMap.set(String(field.nome), String(field.tipo || "STRING").toUpperCase());
    });

    const columnSelects = consolidatedFields.map((field) => {
      const alias = quoteIdentifier(field.nome);
      const sourceType = sourceTypeMap.get(field.nome);

      if (!sourceType) {
        return `CAST(NULL AS ${field.tipo}) AS ${alias}`;
      }

      const sourceId = quoteIdentifier(field.nome);
      if (isComplexSourceType(sourceType)) {
        return `TO_JSON_STRING(${sourceId}) AS ${alias}`;
      }

      const normalizedSourceType = normalizeBqType(sourceType);
      if (normalizedSourceType === field.tipo) {
        return `${sourceId} AS ${alias}`;
      }

      return `SAFE_CAST(${sourceId} AS ${field.tipo}) AS ${alias}`;
    });

    const selectParts = [
      `${quoteLiteral(row.area)} AS __area`,
      `${quoteLiteral(row.datasetId)} AS __source_dataset`,
      `${quoteLiteral(row.tableId)} AS __source_table`,
      ...columnSelects,
    ];

    return `SELECT\n  ${selectParts.join(",\n  ")}\nFROM \`${projectId}.${row.datasetId}.${row.tableId}\``;
  });

  const unionSql = unionSelects.join("\nUNION ALL\n");
  const createTableSql = unionSql
    ? `CREATE OR REPLACE TABLE \`${projectId}.{TARGET_DATASET}.{TARGET_TABLE}\` AS\n${unionSql}`
    : "";
  const createViewSql = unionSql
    ? `CREATE OR REPLACE VIEW \`${projectId}.{TARGET_DATASET}.{TARGET_VIEW}\` AS\n${unionSql}`
    : "";

  return {
    consolidatedFields,
    unionSql,
    createTableSql,
    createViewSql,
  };
}

async function getTableFields(
  dataset: string,
  tabela: string
): Promise<TableMetadataResult> {
  const tableConfig = getTableConfig(dataset, tabela);
  const [metadata] = await bq.dataset(dataset).table(tabela).getMetadata();
  const schemaFields = (metadata?.schema?.fields ?? []) as Array<{
    name?: string;
    type?: string;
    description?: string;
  }>;

  const fields: TableField[] = schemaFields
    .filter((field) => !!field?.name)
    .map((field) => {
      const nome = String(field.name);
      const tipo = String(field.type ?? "STRING").toUpperCase();
      const overrideDescricao = getFieldDescriptionOverride(dataset, tabela, nome);
      const fallbackDescricao =
        tableConfig?.campos.find((c) => c.nome === nome)?.descricao ?? null;

      return {
        nome,
        tipo,
        descricao: overrideDescricao ?? field.description ?? fallbackDescricao,
      };
    });

  const dateFields = fields.filter((f) => isDateType(f.tipo)).map((f) => f.nome);
  const defaultDateField = pickDefaultDateField(
    dateFields,
    tableConfig?.campoDataPadrao
  );
  const tableDescription = String(
    tableConfig?.descricao ?? metadata?.description ?? ""
  );

  return { fields, dateFields, defaultDateField, tableDescription };
}

async function getLatestDateForTable(
  dataset: string,
  tabela: string,
  dateField: string,
  location: string
): Promise<string | null> {
  if (!dateField) return null;

  const tableFqn = `\`${projectId}.${dataset}.${tabela}\``;
  const latestQuery = `
SELECT MAX(DATE(\`${dateField}\`)) AS latest_date
FROM ${tableFqn}
`.trim();

  const [latestRows] = await bq.query({ query: latestQuery, location });
  return extractDateValue((latestRows?.[0] as any)?.latest_date);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "";
    const location = process.env.BQ_LOCATION || "US";

    if (action === "metadata") {
      const dataset = String(body?.dataset ?? "");
      const tabela = String(body?.tabela ?? "");

      if (!dataset || !tabela) {
        return NextResponse.json(
          { error: "Parametros obrigatorios: dataset, tabela" },
          { status: 400 }
        );
      }

      if (!isSafeIdentifier(dataset) || !isSafeIdentifier(tabela)) {
        return NextResponse.json(
          { error: "Identificador de dataset/tabela invalido." },
          { status: 400 }
        );
      }

      const { fields, dateFields, defaultDateField, tableDescription } =
        await getTableFields(dataset, tabela);
      const latestDate = await getLatestDateForTable(
        dataset,
        tabela,
        defaultDateField,
        location
      );

      return NextResponse.json({
        fields,
        dateFields,
        defaultDateField,
        latestDate,
        tableDescription,
      });
    }

    if (action === "schemasBulk") {
      const requestedTables = Array.isArray(body?.tables) ? body.tables : [];
      let targets: CatalogRow[] = [];

      if (requestedTables.length > 0) {
        targets = requestedTables.map((item: any) => {
          const datasetId = String(item?.datasetId ?? item?.dataset ?? "");
          const tableId = String(item?.tableId ?? item?.tabela ?? "");

          return {
            area: String(item?.area ?? "Geral"),
            datasetId,
            datasetLabel: String(item?.datasetLabel ?? datasetId),
            tableId,
            tableLabel: String(item?.tableLabel ?? tableId),
            tableDescription: String(item?.tableDescription ?? ""),
            enabled: true,
          };
        });
      } else {
        await ensureCatalogTableShape(location);
        targets = await loadEnabledCatalogRows(location);
      }

      if (targets.length === 0) {
        return NextResponse.json(
          { error: "Nenhuma tabela habilitada/enviada para gerar schema." },
          { status: 400 }
        );
      }

      const results: SchemaExportRow[] = [];
      const batchSize = 5;

      for (let i = 0; i < targets.length; i += batchSize) {
        const batch = targets.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (target): Promise<SchemaExportRow> => {
            const base: SchemaExportRow = {
              area: target.area,
              datasetId: target.datasetId,
              datasetLabel: target.datasetLabel,
              tableId: target.tableId,
              tableLabel: target.tableLabel,
              tableDescription: target.tableDescription,
              fields: [],
              dateFields: [],
              defaultDateField: "",
              latestDate: null,
            };

            if (!isSafeIdentifier(target.datasetId) || !isSafeIdentifier(target.tableId)) {
              return { ...base, error: "Identificador de dataset/tabela invalido." };
            }

            try {
              const { fields, dateFields, defaultDateField, tableDescription } =
                await getTableFields(target.datasetId, target.tableId);

              const latestDate = await getLatestDateForTable(
                target.datasetId,
                target.tableId,
                defaultDateField,
                location
              );

              return {
                ...base,
                fields,
                dateFields,
                defaultDateField,
                latestDate,
                tableDescription: tableDescription || base.tableDescription,
              };
            } catch (e: any) {
              return {
                ...base,
                error: e?.message || "Falha ao carregar schema da tabela.",
              };
            }
          })
        );

        results.push(...batchResults);
      }

      const succeeded = results.filter((row) => !row.error).length;
      const failed = results.length - succeeded;
      const { consolidatedFields, unionSql, createTableSql, createViewSql } =
        buildConsolidationArtifacts(results);

      return NextResponse.json({
        generatedAt: new Date().toISOString(),
        projectId,
        totalTables: results.length,
        succeeded,
        failed,
        tables: results,
        consolidated: {
          fields: consolidatedFields,
          unionSql,
          createTableSql,
          createViewSql,
        },
      });
    }

    if (action === "tableData") {
      const dataset = String(body?.dataset ?? "");
      const tabela = String(body?.tabela ?? "");

      if (!dataset || !tabela) {
        return NextResponse.json(
          { error: "Parametros obrigatorios: dataset, tabela" },
          { status: 400 }
        );
      }

      if (!isSafeIdentifier(dataset) || !isSafeIdentifier(tabela)) {
        return NextResponse.json(
          { error: "Identificador de dataset/tabela invalido." },
          { status: 400 }
        );
      }

      const { fields, dateFields, defaultDateField, tableDescription } =
        await getTableFields(dataset, tabela);

      const requestedDateField = String(body?.dateField ?? "");
      const dateField =
        requestedDateField && dateFields.includes(requestedDateField)
          ? requestedDateField
          : defaultDateField;

      if (dateField && !isSafeIdentifier(dateField)) {
        return NextResponse.json({ error: "Campo de data invalido." }, { status: 400 });
      }

      const dataInicio = String(body?.dataInicio || defaultDate(-30));
      const dataFim = String(body?.dataFim || defaultDate(0));
      const appliedLimit = clampLimit(body?.limite);
      const tableFqn = `\`${projectId}.${dataset}.${tabela}\``;

      const params: Record<string, string> = {};
      const whereClause = dateField
        ? `WHERE DATE(\`${dateField}\`) BETWEEN @dataInicio AND @dataFim`
        : "";
      const orderClause = dateField ? `ORDER BY DATE(\`${dateField}\`) DESC` : "";

      if (dateField) {
        params.dataInicio = dataInicio;
        params.dataFim = dataFim;
      }

      const dataQuery = `
SELECT *
FROM ${tableFqn}
${whereClause}
${orderClause}
LIMIT ${appliedLimit}
`.trim();

      const [rows] = await bq.query({
        query: dataQuery,
        params,
        location,
      });

      const latestDate = await getLatestDateForTable(
        dataset,
        tabela,
        dateField,
        location
      );

      return NextResponse.json({
        data: rows,
        fields,
        dateFields,
        dateField,
        latestDate,
        appliedLimit,
        tableDescription,
      });
    }

    // Fallback: mantem compatibilidade com SQL livre.
    const sql: string | undefined = body?.query || body?.sql;
    if (!sql || typeof sql !== "string" || !sql.trim()) {
      return NextResponse.json(
        {
          error:
            "Payload invalido. Use action=metadata/action=tableData ou informe query/sql.",
        },
        { status: 400 }
      );
    }

    const [job] = await bq.createQueryJob({
      query: sql,
      location,
    });
    const [rows] = await job.getQueryResults();
    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (err: any) {
    console.error("BQ query error:", err?.message, err?.stack);
    return NextResponse.json(
      { error: "Erro ao executar consulta no BigQuery." },
      { status: 500 }
    );
  }
}
