// app/api/query/route.ts
import { NextRequest, NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";
import {
  tableMap,
  AggregateMode,
  MetricDef,
  baseFields,
  buildFacts,
  calcPacing,
  fmt,
} from "@/lib/tableMap";

// 1) Config BigQuery
const projectId =
  process.env.BQ_PROJECT_ID ||
  process.env.GCP_PROJECT_ID ||
  "worlddata-439415";

const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  : undefined;

const bigquery = new BigQuery({ projectId, credentials });

// 2) Tipagem de colunas para CAST/SUM (ajuste conforme seu schema)
const INT_COLUMNS = new Set<string>([
  // GA4
  "sessions",
  "screenpageviews",
  "activeusers",
  "conversions",
  "propertyid",
  // Ads (Google/Facebook)
  "impressions",
  "clicks",
  "total_impressions",
  "total_reach",
  "total_clicks",
  "total_registros",
  "total_purchases",
  // Social (Facebook Engajamento / Instagram)
  "post_impressions",
  "post_impressions_unique",
  "post_impressions_paid",
  "post_impressions_organic",
  "post_clicks",
  "post_engagements",
  "post_activity_by_action_type_comment",
  "post_activity_by_action_type_share",
  "post_reactions_like_total",
  "post_reactions_love_total",
  "post_reactions_haha_total",
  "post_reactions_wow_total",
  "post_reactions_anger_total",
  "post_video_views",
  "post_video_views_organic",
  "views",
  "reach",
  "like_count",
  "comments_count",
  "saved",
  "total_interactions",
  "profile_visits",
  "follows",
  // Pacing
  "ID_Cliente",
]);

const FLOAT_COLUMNS = new Set<string>([
  // GA4
  "engagementrate",
  "bouncerate",
  "userengagementduration",
  "totalrevenue",
  // Ads
  "spend",
  "total_spend",
  "valor_total_compras",
  "all_conversions_value",
  // Pacing
  "Orcamento_Total",
  "Gasto_Acumulado",
  "Orcamento_Restante",
  "Percentual_Consumido",
  "Investimento_Diario_Ajustado",
]);

// 3) Colunas textuais (não agregáveis)
const NON_AGG_COLS = new Set<string>([
  "city",
  "sessionmedium",
  "sessionsource",
  "devicecategory",
  "pagepath",
  "pagetitle",
  "audiencename",
  "area",
  "produto",
  "origem",
  "Cliente",
  "Status_Orcamento",
]);

// 4) Guard — evita [object Object] no SELECT
function assertOnlyStrings(cols: unknown[], ctx: string) {
  const bad = cols.find(c => typeof c !== "string");
  if (bad !== undefined) {
    console.error("Coluna inválida no SELECT:", bad);
    throw new Error(`[SQL Builder] ${ctx}: coluna não-string passada ao SELECT (provável [object Object]).`);
  }
}

// 5) Gera expressões por coluna (com agregação quando necessário)
function buildSelectParts(
  cols: string[],
  aggregate: AggregateMode
): { selectExprs: string[]; needsGroupBy: boolean } {
  assertOnlyStrings(cols, "buildSelectParts.cols");

  const selectExprs: string[] = cols.map((col) => {
    const q = `\`${col}\``;

    // colunas textuais nunca agregam
    if (NON_AGG_COLS.has(col) || aggregate === "none") {
      return q;
    }

    if (INT_COLUMNS.has(col)) {
      return `SUM(SAFE_CAST(${q} AS INT64)) AS ${q}`;
    }
    if (FLOAT_COLUMNS.has(col)) {
      return `SUM(SAFE_CAST(${q} AS FLOAT64)) AS ${q}`;
    }
    // fallback numérico
    return `SUM(SAFE_CAST(${q} AS NUMERIC)) AS ${q}`;
  });

  return { selectExprs, needsGroupBy: aggregate !== "none" };
}

// 6) Monta SQL final (apenas colunas REAIS; nada de derivados!)
export function buildInsightSQL(
  projectId: string,
  entry: (typeof tableMap)[keyof typeof tableMap],
  dataInicio: string,
  dataFim: string,
  cliente?: string
) {
  const datasetId = entry.dataset;
  const tableId = entry.table;
  const tableFQN = `\`${projectId}.${datasetId}.${tableId}\``;
  const aggregate = entry.aggregate ?? "none";

  const cols = baseFields(entry.metrics);
  assertOnlyStrings(cols, `buildInsightSQL(${datasetId}.${tableId}).baseFields`);

  // SELECT fixos (date e cliente padronizados)
  const selectFixed: string[] = [];
  if (aggregate !== "total") {
    selectFixed.push(`DATE(\`${entry.dateField}\`) AS __date`);
  }
  selectFixed.push(`CAST(\`${entry.clientField}\` AS STRING) AS __client`);

  const { selectExprs, needsGroupBy } = buildSelectParts(cols, aggregate);
  const selectList = [...selectFixed, ...selectExprs].join(",\n  ");

  // filtros
  const whereParts: string[] = [`DATE(\`${entry.dateField}\`) BETWEEN @start AND @end`];
  if (cliente && cliente.trim() !== "") {
    // robusto a caixa e espaços
    whereParts.push(`LOWER(TRIM(CAST(\`${entry.clientField}\` AS STRING))) = LOWER(TRIM(@client))`);
  }
  const whereClause = whereParts.join(" AND ");

  // group by
  const groupBy: string[] = [];
  if (needsGroupBy) {
    if (aggregate === "by_date") groupBy.push(`__date`);
    groupBy.push(`__client`);
  }
  const groupClause = groupBy.length ? `GROUP BY ${groupBy.join(", ")}` : "";

  // order
  const orderClause =
    aggregate === "by_date"
      ? `ORDER BY __date ASC`
      : aggregate === "total"
      ? `ORDER BY __client ASC`
      : `ORDER BY __date ASC`;

  const sql = `
SELECT
  ${selectList}
FROM ${tableFQN}
WHERE ${whereClause}
${groupClause}
${orderClause}
`;

  const params: Record<string, any> = { start: dataInicio, end: dataFim };
  if (cliente && cliente.trim() !== "") params.client = cliente.trim();

  return { sql, params };
}

// 7) Monta o PROMPT final (com FACTS_JSON e, se for o caso, PACING_JSON)
function makeFinalPrompt(
  originKey: keyof typeof tableMap,
  rows: any[],
  dataInicio: string,
  dataFim: string,
  cliente?: string
): { finalPrompt: string; facts: { label: string; value: string }[]; pacing?: any } {
  const entry = tableMap[originKey];

  // facts agregados e formatados
  const factsRaw = buildFacts(rows, entry.metrics);
  const facts = factsRaw.map(f => ({ label: f.label, value: f.formatted }));

  // pacing opcional
  let pacingBlock = "";
  let pacingJson: any | undefined;
  if (originKey === "PacingOrcamento") {
    const sum = (key: string) => rows.reduce((a, r) => a + (Number(r?.[key]) || 0), 0);
    const first = rows?.[0] || {};
    const orcamento = Number(first?.Orcamento_Total) || sum("Orcamento_Total") || 0;
    const gasto = Number(first?.Gasto_Acumulado) || sum("Gasto_Acumulado") || 0;

    const p = calcPacing({
      Orcamento_Total: orcamento,
      Gasto_Acumulado: gasto,
      Data_Inicio: dataInicio,
      Data_Fim: dataFim,
    });

    pacingJson = {
      pacing: {
        dias_totais: p.dias_totais,
        dias_passados: p.dias_passados,
        dias_restantes: p.dias_restantes,
        burn_atual_dia: fmt.brl2(p.burn_atual_dia),
        burn_ideal_dia: fmt.brl2(p.burn_ideal_dia),
        dif_burn_dia: fmt.brl2(p.dif_burn_dia),
        orcamento_restante: fmt.brl2(p.orcamento_restante),
        "%_consumido": fmt.percent1(p.perc_consumido),
      }
    };
    pacingBlock = `\nPACING_JSON:\n${JSON.stringify(pacingJson, null, 2)}\n`;
  }

  const payload = { facts };
  const factsBlock = `FACTS_JSON:\n${JSON.stringify(payload, null, 2)}\n`;

  const finalPrompt =
    entry.prompt +
    `\n\n---\nPERÍODO: ${dataInicio}–${dataFim}${cliente ? ` | CLIENTE: ${cliente}` : ""}\n` +
    factsBlock +
    pacingBlock;

  return { finalPrompt, facts, pacing: pacingJson };
}

// 8) Handler
export async function POST(req: NextRequest) {
  try {
    const { originKey, dataInicio, dataFim, cliente } = await req.json();

    if (!originKey || !dataInicio || !dataFim) {
      return NextResponse.json(
        { error: "Parâmetros obrigatórios: originKey, dataInicio, dataFim" },
        { status: 400 }
      );
    }

    const entry = tableMap[originKey as keyof typeof tableMap];
    if (!entry) {
      return NextResponse.json({ error: "Origem inválida" }, { status: 400 });
    }

    const { sql, params } = buildInsightSQL(projectId, entry, dataInicio, dataFim, cliente);

    const [rows] = await bigquery.query({
      query: sql,
      params,
      location: process.env.BQ_LOCATION || "US",
    });

    // facts + prompt final já aqui (evita erros de “JSON ausente”)
    const { finalPrompt, facts, pacing } = makeFinalPrompt(
      originKey as keyof typeof tableMap,
      rows,
      dataInicio,
      dataFim,
      cliente
    );

    return NextResponse.json({ data: rows, sql, facts, pacing, prompt: finalPrompt });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro desconhecido" },
      { status: 500 }
    );
  }
}
