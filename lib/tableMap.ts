// =========================
// ANALYTICS PROMPT ENGINE — tableMap.ts
// =========================

export type AggregateMode = "none" | "by_date" | "total";

// ---- Agregação / Definições de Métricas ----
export type MetricAgg =
  | { type: "sum" }                                            // soma simples
  | { type: "avg"; weightBy?: string }                         // média (ponderada por weightBy quando fizer sentido)
  | { type: "ratio"; num: string; den: string };               // derivadas (CTR = clicks/impressions)

// inclui float0
export type MetricFormat = "int" | "float0" | "float1" | "float2" | "percent1" | "brl2" | "duration_s";

export interface MetricDef {
  field: string;               // nome do campo no dataset (ou pseudo-campo p/ derivadas)
  label: string;               // rótulo amigável
  agg: MetricAgg;              // como agregar
  format: MetricFormat;        // como formatar na saída
  optional?: boolean;          // quando faltar dado, vira N/A sem quebrar
}

export interface TableMapEntry {
  label: string;
  dataset: string;
  table: string;
  dateField: string;
  clientField: string;
  metrics: MetricDef[];
  prompt: string;
  aggregate?: AggregateMode;
}

// ---- Formatação (BRL, %, etc.) ----
export const fmt = {
  brl2: (v: number | null | undefined) =>
    v == null ? "N/A" : `R$ ${v.toFixed(2).replace(".", ",")}`,
  percent1: (v: number | null | undefined) => {
    if (v == null) return "N/A";
    const p = v <= 1 ? v * 100 : v;
    return `${p.toFixed(1).replace(".", ",")}%`;
  },
  float0: (v: number | null | undefined) =>
    v == null ? "N/A" : Math.round(v).toString().replace(".", ","),
  float1: (v: number | null | undefined) =>
    v == null ? "N/A" : v.toFixed(1).replace(".", ","),
  float2: (v: number | null | undefined) =>
    v == null ? "N/A" : v.toFixed(2).replace(".", ","),
  int: (v: number | null | undefined) =>
    v == null ? "N/A" : Math.round(v).toLocaleString("pt-BR"),
  duration_s: (v: number | null | undefined) =>
    v == null ? "N/A" : `${v.toFixed(0)}s`,
};

// ---- Agregadores robustos ----
export function aggregateMetric(rows: any[], metric: MetricDef): number | null {
  const values = rows.map(r => r?.[metric.field]).filter(v => v != null);

  if (metric.agg.type === "sum") {
    return values.reduce((a: number, b: number) => a + b, 0);
  }

  if (metric.agg.type === "avg") {
    const avgMetric = metric.agg as { type: "avg"; weightBy?: string };
    if (avgMetric.weightBy) {
      const w = avgMetric.weightBy;
      const num = rows.reduce((acc, r) => acc + (r?.[metric.field] ?? 0) * (r?.[w] ?? 0), 0);
      const den = rows.reduce((acc, r) => acc + (r?.[w] ?? 0), 0);
      return den > 0 ? num / den : null;
    }
    const n = values.length;
    return n ? values.reduce((a: number, b: number) => a + b, 0) / n : null;
  }

  if (metric.agg.type === "ratio") {
    const ratioMetric = metric.agg as { type: "ratio"; num: string; den: string };
    const num = rows.reduce((acc, r) => acc + (r?.[ratioMetric.num] ?? 0), 0);
    const den = rows.reduce((acc, r) => acc + (r?.[ratioMetric.den] ?? 0), 0);
    return den > 0 ? num / den : null;
  }

  return null;
}

// ---- Construção do bloco "facts" ----
export type FactRow = { label: string; field: string; raw: number | null; formatted: string };

export function buildFacts(rows: any[], metrics: MetricDef[]): FactRow[] {
  return metrics.map(m => {
    const val = aggregateMetric(rows, m);
    let formatted: string;
    switch (m.format) {
      case "brl2": formatted = fmt.brl2(val); break;
      case "percent1": formatted = fmt.percent1(val); break;
      case "float0": formatted = fmt.float0(val); break;
      case "float1": formatted = fmt.float1(val); break;
      case "float2": formatted = fmt.float2(val); break;
      case "duration_s": formatted = fmt.duration_s(val); break;
      default: formatted = fmt.int(val); break;
    }
    return { label: m.label, field: m.field, raw: val, formatted };
  });
}

// =========================
// UTIL: baseFields para SELECT (só colunas REAIS)
// =========================
export function baseFields(metrics: MetricDef[]): string[] {
  const set = new Set<string>();
  for (const m of metrics) {
    if (m.agg.type === "ratio") {
      set.add(m.agg.num);
      set.add(m.agg.den);
    } else {
      set.add(m.field);
      if (m.agg.type === "avg" && m.agg.weightBy) set.add(m.agg.weightBy);
    }
  }
  return [...set];
}

// =========================
// Pacing
// =========================
export type PacingInputs = {
  Orcamento_Total: number;
  Gasto_Acumulado: number;
  Data_Inicio: string; // YYYY-MM-DD
  Data_Fim: string;    // YYYY-MM-DD
  hojeISO?: string;
};

export type PacingCalc = {
  dias_totais: number;
  dias_passados: number;
  dias_restantes: number;
  orcamento_total: number;
  gasto_acumulado: number;
  orcamento_restante: number;
  perc_consumido: number;          // 0–1
  burn_atual_dia: number;          // gasto_acumulado / dias_passados
  burn_ideal_dia: number;          // orcamento_total / dias_totais
  dif_burn_dia: number;            // atual - ideal
};

export function calcPacing(i: PacingInputs): PacingCalc {
  const start = new Date(i.Data_Inicio + "T00:00:00Z");
  const end   = new Date(i.Data_Fim + "T00:00:00Z");
  const hoje  = new Date((i.hojeISO ?? i.Data_Fim) + "T00:00:00Z");

  const msDia = 24 * 60 * 60 * 1000;
  const dias_totais = Math.max(1, Math.round((end.getTime() - start.getTime()) / msDia) + 1);
  const dias_passados = Math.min(
    dias_totais,
    Math.max(1, Math.round((Math.min(hoje.getTime(), end.getTime()) - start.getTime()) / msDia) + 1)
  );
  const dias_restantes = Math.max(0, dias_totais - dias_passados);

  const orcamento_total = i.Orcamento_Total ?? 0;
  const gasto_acumulado = i.Gasto_Acumulado ?? 0;
  const orcamento_restante = Math.max(0, orcamento_total - gasto_acumulado);

  const burn_atual_dia = dias_passados > 0 ? gasto_acumulado / dias_passados : 0;
  const burn_ideal_dia = dias_totais > 0 ? orcamento_total / dias_totais : 0;
  const dif_burn_dia = burn_atual_dia - burn_ideal_dia;

  const perc_consumido = orcamento_total > 0 ? gasto_acumulado / orcamento_total : 0;

  return {
    dias_totais, dias_passados, dias_restantes,
    orcamento_total, gasto_acumulado, orcamento_restante,
    perc_consumido, burn_atual_dia, burn_ideal_dia, dif_burn_dia,
  };
}

// =========================
// PROMPTS (blindados por origem)
// =========================

// GA4 — Analytics
const PROMPT_GA4 = `
Você é um analista sênior de dados. Use APENAS os "facts" (JSON) anexados ao final — cada item tem {label, value} já formatado.
- NÃO recalcule, NÃO invente, NÃO use placeholders. Se faltar, escreva "N/A".
- NÃO mencione métricas de mídia paga (CTR, CPC, CPA, ROAS, Impressões/Cliques de anúncio).

Análise para o período de {dataInicio} a {dataFim}.
{pagepath, Página analisada: {pagepath}}

Formate em Markdown nesta ordem:

### 1) Resumo executivo (3 bullets)
- Qualidade do tráfego (tempo médio engajado, PV/Sessão) e impacto em conversões.
- Picos/vales do período e hipóteses.
- Quick wins.

### 2) KPIs do período (tabela 2 colunas)
- Sessões
- Usuários ativos
- Pageviews
- Tempo médio engajado (s)
- Engagement rate
- Bounce rate
- Conversões
- Receita
- Conv./Sessão
- PV/Sessão

### 3) Diagnóstico (até 6 bullets)
- Relação qualidade × conversão; sinais de atrito.

### 4) Recomendações
- UX/Conteúdo; Jornada; Performance.

### 5) Próximos passos (3–5)
- Metas claras (ex.: +0,2 PV/Sessão; +0,5 pp ER).
`;

// Google Ads
const PROMPT_GOOGLE_ADS = `
Você é um especialista em Google Ads. Use APENAS os "facts" (JSON) anexados — {label, value} já formatado.
- NÃO recalcule, NÃO invente, NÃO use placeholders. Se faltar, "N/A".
- NÃO mencione métricas de analytics (Sessões, PV/Sessão, Tempo engajado).

Formate em Markdown nesta ordem:

### 1) Resumo (3 bullets)
- Eficiência do funil (CTR, Taxa de conversão) e impacto em CPC, CPA, ROAS.
- O que melhorou/piorou.
- Quick wins.

### 2) KPIs (tabela 2 colunas)
- Impressões
- Cliques
- CTR
- Gasto
- CPC
- Conversões
- Taxa de conversão
- CPA
- Receita
- ROAS

### 3) Diagnóstico (até 6 bullets)
- Gargalos (CTR bom × CVR baixo; CPC alto × CPA alto; ROAS baixo).

### 4) Recomendações
- Termos; Anúncios; Lances/Orçamento; Página de destino.

### 5) Próximos passos (3–5)
- Experimentos com metas (ex.: +0,3 pp CVR; -15% CPA).
`;

// Facebook Ads — Funil (tráfego pago)
const PROMPT_FACEBOOK_ADS = `
Você é um media buyer. Use APENAS os "facts" (JSON) anexados — {label, value} já formatado.
- NÃO recalcule, NÃO invente, NÃO use placeholders. Se faltar, "N/A".

Formate em Markdown nesta ordem:

### 1) Resumo (3 bullets)
- Melhoras/pioras em Impressões, CTR, CPA/ROAS, com hipótese.

### 2) KPIs (tabela 2 colunas)
- Impressões
- Alcance
- Cliques
- CTR
- Gasto
- Registros
- Compras
- Receita
- CPR
- CPA
- ROAS
- Ticket médio

### 3) Diagnóstico (até 6 bullets)
- Funil (imp → clique → conv) e gargalos.

### 4) Recomendações
- Criativos; Audiência; Lances/Orçamento; Landing.

### 5) Próximos passos
- 3–5 ações com impacto × esforço.
`;

// Engajamento Facebook (orgânico+pago agregado)
const PROMPT_ENG_FBK = `
Você é estrategista de social. Use APENAS os "facts" (JSON) anexados — {label, value} já formatado.
- NÃO recalcule, NÃO invente, NÃO use placeholders. Se faltar, "N/A".

Formate em Markdown nesta ordem:

### 1) Resumo (3 bullets)
- Variação de alcance e engajamento; hipóteses de conteúdo/formato.

### 2) KPIs (tabela 2 colunas)
- Impressões totais
- Impressões únicas
- Impressões pagas
- Impressões orgânicas
- Cliques
- Engajamentos
- Reações (like/love/haha/wow/anger)
- Comentários
- Compartilhamentos
- Views de vídeo (total)
- Views de vídeo orgânico
- ER
- Share rate
- Comment rate

### 3) Diagnóstico (até 6 bullets)
- O que puxou ER; orgânico × pago.

### 4) Recomendações
- Linha editorial (temas/ganchos), formatos, cadência, CTA.

### 5) Próximos passos
- 3–5 experimentos com hipótese e meta (ER, share rate).
`;

// Engajamento Instagram
const PROMPT_INSTAGRAM = `
Você é estrategista de social. Use APENAS os "facts" (JSON) anexados — {label, value} já formatado.
- NÃO recalcule, NÃO invente, NÃO use placeholders. Se faltar, "N/A".

Formate em Markdown nesta ordem:

### 1) Resumo (3 bullets)
- Variações em Views, ER e seguidores; 1–2 quick wins.

### 2) KPIs (tabela 2 colunas)
- Views
- Alcance
- Curtidas
- Comentários
- Salvamentos
- Interações totais
- Visitas ao perfil
- Novos seguidores
- ER
- Save rate
- Follow rate
- View-through

### 3) Diagnóstico (até 6 bullets)
- O que puxou ER & Follow rate; sinais de saturação.

### 4) Recomendações
- Temas/ganchos, duração, capa/legenda, CTA, cadência.

### 5) Próximos passos
- 3–5 testes com hipótese e métrica-alvo (ER, Follow rate, VTR).
`;

// Pacing
const PROMPT_PACING = `
Você é gestor de orçamento de mídia. Use APENAS:
- "facts": números do período (formatados)
- "pacing": JSON com cálculos já prontos e formatados (dias_totais, dias_passados, dias_restantes, burn_atual_dia, burn_ideal_dia, dif_burn_dia, orcamento_restante, %_consumido)

Formate em Markdown nesta ordem:

### 1) Resumo (2–3 bullets)
- Classifique: **adiantado** (dif_burn_dia > 0), **atrasado** (dif_burn_dia < 0) ou **no prazo** (~0).
- Explique com burn atual vs ideal.

### 2) Pacing (tabela)
- Orçamento total (R$)
- Gasto acumulado (R$)
- % Consumido
- Dias passados
- Dias restantes
- Burn atual (R$/dia)
- Burn ideal (R$/dia)
- Diferença (R$/dia)
- Orçamento restante (R$)

### 3) Recomendações
- Ajuste de ritmo diário e realocação.

### 4) Próximos passos
- 3 ações imediatas + monitoramento diário.
`;

// =========================
// MÉTRICAS POR FONTE
// =========================

// GA4 (taxas ponderadas por sessões)
const GA4Metrics: MetricDef[] = [
  { field: "sessions",               label: "Sessões",                  agg: { type: "sum" },                          format: "int" },
  { field: "activeusers",            label: "Usuários ativos",          agg: { type: "sum" },                          format: "int" },
  { field: "screenpageviews",        label: "Pageviews",                agg: { type: "sum" },                          format: "int" },
  { field: "userengagementduration", label: "Tempo engajado total (s)", agg: { type: "sum" },                          format: "int" },
  { field: "engagementrate",         label: "Engagement rate",          agg: { type: "avg", weightBy: "sessions" },    format: "percent1" },
  { field: "bouncerate",             label: "Bounce rate",              agg: { type: "avg", weightBy: "sessions" },    format: "percent1" },
  { field: "conversions",            label: "Conversões",               agg: { type: "sum" },                          format: "int" },
  { field: "totalrevenue",           label: "Receita",                  agg: { type: "sum" },                          format: "brl2" },
  // Derivadas
  { field: "conv_per_session",       label: "Conv./Sessão",             agg: { type: "ratio", num: "conversions", den: "sessions" },        format: "float2" },
  { field: "pv_per_session",         label: "PV/Sessão",                agg: { type: "ratio", num: "screenpageviews", den: "sessions" },     format: "float2" },
  { field: "avg_engaged_s",          label: "Tempo médio engajado (s)", agg: { type: "ratio", num: "userengagementduration", den: "activeusers" }, format: "duration_s" },
];

// Facebook Ads — Funil
const FunilFacebookMetrics: MetricDef[] = [
  { field: "total_impressions",    label: "Impressões",        agg: { type: "sum" },  format: "int" },
  { field: "total_reach",          label: "Alcance",           agg: { type: "sum" },  format: "int" },
  { field: "total_clicks",         label: "Cliques",           agg: { type: "sum" },  format: "int" },
  { field: "ctr",                  label: "CTR",               agg: { type: "ratio", num: "total_clicks", den: "total_impressions" }, format: "percent1" },
  { field: "total_spend",          label: "Gasto",             agg: { type: "sum" },  format: "brl2" },
  { field: "total_registros",      label: "Registros",         agg: { type: "sum" },  format: "int" },
  { field: "total_purchases",      label: "Compras",           agg: { type: "sum" },  format: "int" },
  { field: "valor_total_compras",  label: "Receita",           agg: { type: "sum" },  format: "brl2" },
  { field: "cpr",                  label: "CPR",               agg: { type: "ratio", num: "total_spend", den: "total_registros" }, format: "brl2", optional: true },
  { field: "cpa",                  label: "CPA",               agg: { type: "ratio", num: "total_spend", den: "total_purchases" }, format: "brl2", optional: true },
  { field: "roas",                 label: "ROAS",              agg: { type: "ratio", num: "valor_total_compras", den: "total_spend" }, format: "float2" },
  { field: "ticket_medio",         label: "Ticket médio",      agg: { type: "ratio", num: "valor_total_compras", den: "total_purchases" }, format: "brl2", optional: true },
];

// Engajamento Facebook (org + pago agreg.)
const EngajamentoFacebookMetrics: MetricDef[] = [
  { field: "post_impressions",                   label: "Impressões totais",              agg: { type: "sum" }, format: "int" },
  { field: "post_impressions_unique",            label: "Impressões únicas",              agg: { type: "sum" }, format: "int" },
  { field: "post_impressions_paid",              label: "Impressões pagas",               agg: { type: "sum" }, format: "int" },
  { field: "post_impressions_organic",           label: "Impressões orgânicas",           agg: { type: "sum" }, format: "int" },
  { field: "post_clicks",                        label: "Cliques",                         agg: { type: "sum" }, format: "int" },
  { field: "post_engagements",                   label: "Engajamentos",                    agg: { type: "sum" }, format: "int" },
  { field: "post_activity_by_action_type_comment", label: "Comentários",                  agg: { type: "sum" }, format: "int" },
  { field: "post_activity_by_action_type_share",   label: "Compartilhamentos",            agg: { type: "sum" }, format: "int" },
  { field: "post_reactions_like_total",          label: "Reações like",                    agg: { type: "sum" }, format: "int" },
  { field: "post_reactions_love_total",          label: "Reações love",                    agg: { type: "sum" }, format: "int" },
  { field: "post_reactions_haha_total",          label: "Reações haha",                    agg: { type: "sum" }, format: "int" },
  { field: "post_reactions_wow_total",           label: "Reações wow",                     agg: { type: "sum" }, format: "int" },
  { field: "post_reactions_anger_total",         label: "Reações anger",                   agg: { type: "sum" }, format: "int" },
  { field: "post_video_views",                    label: "Views de vídeo (total)",         agg: { type: "sum" }, format: "int" },
  { field: "post_video_views_organic",            label: "Views de vídeo (orgânico)",      agg: { type: "sum" }, format: "int" },
  // Derivadas
  { field: "er",                                  label: "ER",                              agg: { type: "ratio", num: "post_engagements", den: "post_impressions" }, format: "percent1", optional: true },
  { field: "share_rate",                          label: "Share rate",                      agg: { type: "ratio", num: "post_activity_by_action_type_share", den: "post_impressions" }, format: "percent1", optional: true },
  { field: "comment_rate",                        label: "Comment rate",                    agg: { type: "ratio", num: "post_activity_by_action_type_comment", den: "post_impressions" }, format: "percent1", optional: true },
];

// Engajamento Instagram
const EngajamentoInstagramMetrics: MetricDef[] = [
  { field: "views",              label: "Views",               agg: { type: "sum" },  format: "int" },
  { field: "reach",              label: "Alcance",             agg: { type: "sum" },  format: "int" },
  { field: "like_count",         label: "Curtidas",            agg: { type: "sum" },  format: "int" },
  { field: "comments_count",     label: "Comentários",         agg: { type: "sum" },  format: "int" },
  { field: "saved",              label: "Salvamentos",         agg: { type: "sum" },  format: "int" },
  { field: "total_interactions", label: "Interações totais",   agg: { type: "sum" },  format: "int" },
  { field: "profile_visits",     label: "Visitas ao perfil",   agg: { type: "sum" },  format: "int" },
  { field: "follows",            label: "Novos seguidores",    agg: { type: "sum" },  format: "int" },
  // Derivadas
  { field: "ER",                 label: "ER",                  agg: { type: "ratio", num: "total_interactions", den: "views" },          format: "percent1", optional: true },
  { field: "save_rate",          label: "Save rate",           agg: { type: "ratio", num: "saved", den: "views" },                       format: "percent1", optional: true },
  { field: "follow_rate",        label: "Follow rate",         agg: { type: "ratio", num: "follows", den: "profile_visits" },            format: "percent1", optional: true },
  { field: "vtr",                label: "View-through",        agg: { type: "ratio", num: "views", den: "reach" },                       format: "percent1", optional: true },
];

// Google Ads
const GoogleAdsMetrics: MetricDef[] = [
  { field: "impressions",            label: "Impressões",          agg: { type: "sum" },  format: "int" },
  { field: "clicks",                 label: "Cliques",             agg: { type: "sum" },  format: "int" },
  { field: "ctr",                    label: "CTR",                 agg: { type: "ratio", num: "clicks", den: "impressions" }, format: "percent1" },
  { field: "spend",                  label: "Gasto",               agg: { type: "sum" },  format: "brl2" },
  { field: "cpc",                    label: "CPC",                 agg: { type: "ratio", num: "spend", den: "clicks" }, format: "brl2" },
  { field: "conversions",            label: "Conversões",          agg: { type: "sum" },  format: "int" },
  { field: "cvr",                    label: "Taxa de conversão",   agg: { type: "ratio", num: "conversions", den: "clicks" }, format: "percent1" },
  { field: "cpa",                    label: "CPA",                 agg: { type: "ratio", num: "spend", den: "conversions" }, format: "brl2" },
  { field: "all_conversions_value",  label: "Receita",             agg: { type: "sum" },  format: "brl2" },
  { field: "roas",                   label: "ROAS",                agg: { type: "ratio", num: "all_conversions_value", den: "spend" }, format: "float2" },
];

// =========================
// MAPA DE TABELAS (TODAS AS ORIGENS)
// =========================
export const tableMap: Record<string, TableMapEntry> = {
  // GA4
  CampanhaGoogleAnalytics: {
    label: "Campanha Google Analytics (GA4)",
    dataset: "ga4",
    table: "Consolidado_GA4",
    dateField: "data",
    clientField: "cliente",
    metrics: GA4Metrics,
    prompt: PROMPT_GA4,
    aggregate: "by_date",
  },

  // Google Ads
  CampanhaGoogleAds: {
    label: "Campanha Google Ads",
    dataset: "Ads",
    table: "Google_Daily",
    dateField: "data",
    clientField: "cliente",
    metrics: GoogleAdsMetrics,
    prompt: PROMPT_GOOGLE_ADS,
    aggregate: "by_date",
  },

  // Facebook Ads — Funil
  Funil_Granil: {
    label: "Tráfego Facebook Ads",
    dataset: "Ads",
    table: "Funil_Granular",
    dateField: "data_inicio",
    clientField: "account_name",
    metrics: FunilFacebookMetrics,
    prompt: PROMPT_FACEBOOK_ADS,
    aggregate: "by_date",
  },

  // Engajamento Facebook
  EngajamentoFacebook: {
    label: "Growth Facebook",
    dataset: "Midias",
    table: "EngajamentoFacebook",
    dateField: "data",
    clientField: "cliente",
    metrics: EngajamentoFacebookMetrics,
    prompt: PROMPT_ENG_FBK,
    aggregate: "by_date",
  },

  // Engajamento Instagram
  EngajamentoInstagram: {
    label: "Growth Instagram",
    dataset: "Midias_Instagram",
    table: "EngajamentoInstagram",
    dateField: "data",
    clientField: "cliente",
    metrics: EngajamentoInstagramMetrics,
    prompt: PROMPT_INSTAGRAM,
    aggregate: "by_date",
  },

  // Pacing
  PacingOrcamento: {
    label: "Análise de Pacing de Orçamento",
    dataset: "Auxiliar",
    table: "OrcamentoConsolidado",
    dateField: "Data_Inicio",
    clientField: "Cliente",
    metrics: [
      { field: "Orcamento_Total",         label: "Orçamento total (R$)",         agg: { type: "sum" }, format: "brl2" },
      { field: "Gasto_Acumulado",         label: "Gasto acumulado (R$)",         agg: { type: "sum" }, format: "brl2" },
      { field: "Orcamento_Restante",      label: "Orçamento restante (R$)",      agg: { type: "sum" }, format: "brl2", optional: true },
      { field: "Percentual_Consumido",    label: "% Consumido",                  agg: { type: "avg" },  format: "percent1", optional: true },
      { field: "Dias_Restantes",          label: "Dias restantes (origem)",      agg: { type: "avg" },  format: "float0", optional: true },
      { field: "Investimento_Diario_Ajustado", label: "Invest. diário ajustado", agg: { type: "avg" },  format: "brl2", optional: true },
      { field: "Status_Orcamento",        label: "Status (origem)",              agg: { type: "avg" },  format: "float1", optional: true },
    ],
    prompt: PROMPT_PACING,
    aggregate: "total",
  },
};
