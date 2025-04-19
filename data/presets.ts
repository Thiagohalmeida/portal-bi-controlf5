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
  }
]
