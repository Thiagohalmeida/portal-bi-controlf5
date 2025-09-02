// lib/queryBuilder.ts
import { tableMap, AggregateMode, baseFields } from "./tableMap";

// Tipagem de colunas para CAST/SUM (ajuste conforme seu schema)
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

// Colunas textuais (não agregáveis)
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

// Guard — evita [object Object] no SELECT
function assertOnlyStrings(cols: unknown[], ctx: string) {
  const bad = cols.find(c => typeof c !== "string");
  if (bad !== undefined) {
    console.error("Coluna inválida no SELECT:", bad);
    throw new Error(`[SQL Builder] ${ctx}: coluna não-string passada ao SELECT (provável [object Object]).`);
  }
}

// Gera expressões por coluna (com agregação quando necessário)
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

// Monta SQL final (apenas colunas REAIS; nada de derivados!)
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