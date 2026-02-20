export type FieldDescriptionOverrides = Record<
  string,
  Record<string, Record<string, string>>
>;

/**
 * Override manual de descrições de campos.
 *
 * Estrutura:
 * {
 *   Dataset: {
 *     Tabela: {
 *       campo: "Descrição amigável"
 *     }
 *   }
 * }
 *
 * Prioridade no retorno da API:
 * 1) override local (este arquivo)
 * 2) descrição do schema no BigQuery
 * 3) descrição em data/metadados.ts
 */
export const fieldDescriptionOverrides: FieldDescriptionOverrides = {
  Midias_Instagram: {
    EngajamentoInstagram: {
      tipo_cliente: "Tipo de cliente associado ao registro",
      media_id: "Identificador único da mídia/publicação",
      media_type: "Tipo de mídia (imagem, vídeo, carrossel etc.)",
      media_product_type: "Formato/produto da mídia no Instagram",
      permalink: "URL pública permanente da publicação",
      impressions: "Total de impressões da publicação",
      impressions_unique: "Total de impressões únicas da publicação",
      impressions_paid: "Impressões de origem paga",
      impressions_organic: "Impressões de origem orgânica",
      engagement: "Total de engajamentos da publicação",
      comments: "Quantidade de comentários",
      shares: "Quantidade de compartilhamentos",
      likes: "Quantidade de curtidas",
      saves: "Quantidade de salvamentos",
      profile_visits: "Visitas ao perfil geradas pela publicação",
      follows: "Seguidores conquistados a partir da publicação",
      reach: "Alcance da publicação",
      video_views: "Visualizações de vídeo",
    },
  },
};

export function getFieldDescriptionOverride(
  dataset: string,
  tabela: string,
  fieldName: string
): string | undefined {
  return fieldDescriptionOverrides?.[dataset]?.[tabela]?.[fieldName];
}
