// data/presets.ts
export type Preset = {
  area: string
  dataset: string
  tabela: string
  descricao: string
  insight?: string
  sql: string
}

export const presets: Preset[] = [
  {
    area: "Growth",
    dataset: "Midias",
    tabela: "EngajamentoFacebook",
    descricao: "Posts com maior engajamento no Facebook",
    insight: "Analisa os posts com maior engajamento geral.",
    sql: `
      SELECT *
      FROM ` + "`worlddata-439415.Midias.EngajamentoFacebook`" + `
      LIMIT 100
    `.trim()
  },
  {
    area: "Growth",
    dataset: "Midias_Instagram",
    tabela: "EngajamentoInstagram",
    descricao: "Posts com maior engajamento no Instagram",
    insight: "Analisa os posts com maior engajamento geral.",
    sql: `
      SELECT *
      FROM ` + "`worlddata-439415.Midias_Instagram.EngajamentoInstagram`" + `
      LIMIT 100
    `.trim()
  },
  // GA4 – Top páginas por conversões (últimos 30 dias)
  {
    area: "Growth",
    dataset: "ga4",
    tabela: "Consolidado_GA4",
    descricao: "GA4 • Top páginas por conversões (últimos 30d)",
    sql: `
      SELECT
        pagepath,
        pagetitle,
        SUM(conversions) AS conv,
        SUM(totalrevenue) AS revenue,
        SUM(screenpageviews) AS views
      FROM ` + "`worlddata-439415.ga4.Consolidado_GA4`" + `
      WHERE data >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      GROUP BY pagepath, pagetitle
      ORDER BY conv DESC
      LIMIT 100
    `.trim(),
  },
  // GA4 – Canais (source/medium) por conversões/receita (últimos 30 dias)
  {
    area: "Growth",
    dataset: "ga4",
    tabela: "Consolidado_GA4",
    descricao: "GA4 • Canais por conversões/receita (últimos 30d)",
    sql: `
      SELECT
        sessionsource AS source,
        sessionmedium AS medium,
        SUM(sessions) AS sessions,
        SUM(conversions) AS conv,
        SUM(totalrevenue) AS revenue
      FROM ` + "`worlddata-439415.ga4.Consolidado_GA4`" + `
      WHERE data >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      GROUP BY source, medium
      ORDER BY conv DESC, revenue DESC
      LIMIT 100
    `.trim(),
  },
  // GA4 – Funil básico por dispositivo (últimos 30 dias)
  {
    area: "Growth",
    dataset: "ga4",
    tabela: "Consolidado_GA4",
    descricao: "GA4 • Funil por dispositivo (sessões → engajamento → conversões)",
    sql: `
      SELECT
        devicecategory,
        SUM(sessions) AS sessions,
        SUM(activeusers) AS active_users,
        SAFE_DIVIDE(SUM(userengagementduration), SUM(sessions)) AS avg_engagement_sess,
        AVG(engagementrate) AS avg_eng_rate,
        SUM(conversions) AS conv,
        SUM(totalrevenue) AS revenue,
        AVG(bouncerate) AS avg_bounce
      FROM ` + "`worlddata-439415.ga4.Consolidado_GA4`" + `
      WHERE data >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      GROUP BY devicecategory
      ORDER BY conv DESC
      LIMIT 100
    `.trim(),
  }
]
