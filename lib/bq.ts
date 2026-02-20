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

const projectId = process.env.BQ_PROJECT_ID || "worlddata-439415";
const clientEmail = process.env.BQ_CLIENT_EMAIL;
const privateKey = (process.env.BQ_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

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
