export interface TableMapEntry {
    label: string;
    dataset: string;
    table: string;
    dateField: string;
    clientField: string;
    metrics: string[];
    prompt: string;
  }
  
  export const tableMap: Record<string, TableMapEntry> = {
    Funil_Granular: {
      label: "Trafego_Facebook",
      dataset: "Ads",
      table: "Funil_Granular",
      dateField: "data_inicio",
      clientField: "account_name",
      metrics: [
        "total_impressions",
        "total_reach",
        "total_clicks",
        "ctr_percent",
        "total_spend",
        "total_registros",
        "total_purchases",
        "valor_total_compras",
        "custo_por_registro",
        "custo_por_compra",
        "roas",
        "ticket_medio"
      ],
      prompt:
        "Você é um analista de tráfego. Analise os resultados dos clientes entre {dataInicio} e {dataFim}:"
    },
  
    EngajamentoFacebook: {
      label: "Growth Facebook",
      dataset: "Midias",
      table: "EngajamentoFacebook",
      dateField: "data",
      clientField: "cliente",
      metrics: [
        "post_impressions",
        "post_impressions_unique",
        "post_impressions_paid",
        "post_impressions_organic",
        "post_clicks",
        "post_engagements",
        "post_activity",
        "post_reactions_like_total",
        "post_reactions_love_total",
        "post_reactions_haha_total",
        "post_reactions_anger_total",
        "post_reactions_wow_total",
        "post_activity_by_action_type_comment",
        "post_activity_by_action_type_share",
        "post_video_views",
        "post_video_views_organic"
      ],
      prompt:
        "Você é um analista de redes sociais. Analise os indicadores de postagens do **Facebook** dos clientes entre {dataInicio} e {dataFim}:"
    },
  
    EngajamentoInstagram: {
      label: "Growth Instagram",
      dataset: "Midias_Instagram",
      table: "EngajamentoInstagram",
      dateField: "data",
      clientField: "cliente",
      metrics: [
        "impressions",
        "reach",
        "like_count",
        "comments_count",
        "saved",
        "views",
        "total_interactions",
        "profile_visits",
        "follows"
      ],
      prompt:
        "Você é um analista de redes sociais. Analise os indicadores de postagens do **Instagram** dos clientes entre {dataInicio} e {dataFim}:"
    },
    CampanhaGoogleAds: {
      label: "Campanha Google Ads",
      dataset: "Ads",
      table: "Google_Daily",
      dateField: "data",
      clientField: "cliente",
      metrics: [
        "spend",
        "clicks",
        "conversions",
        "impressions",
        "all_conversions_value"
        ],
      prompt:
        "Você é um analista de campanhas Google Ads. Analise os indicadores das campanhas entre {dataInicio} e {dataFim}:"
    }
  };
  