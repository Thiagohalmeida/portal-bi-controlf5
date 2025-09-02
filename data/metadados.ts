// data/metadados.ts
// Tipagens explícitas
type Campo = {
  nome: string;
  tipo: string;
  descricao: string;
};

type Tabela = {
  nome: string;
  descricao: string;
  campos: Campo[];
};

export type DatasetMetadado = {
  area: string;
  dataset: string;
  tabelas: Tabela[];
};

export const metadados: DatasetMetadado[] = [
  {
    area: "Growth",
    dataset: "Midias",
    tabelas: [
      {
        nome: "EngajamentoFacebook",
        descricao: "Resultado das postagens no Facebook",
        campos: [
          { nome: "cliente", tipo: "STRING", descricao: "Identificador do cliente" },
          { nome: "data", tipo: "DATE", descricao: "Data da publicação" },
          { nome: "post_id", tipo: "STRING", descricao: "ID da postagem" },
          { nome: "post_name", tipo: "STRING", descricao: "Nome da postagem" },
          { nome: "permalink_url", tipo: "STRING", descricao: "URL permanente da postagem" },
          { nome: "post_impressions", tipo: "INT64", descricao: "Total de impressões da postagem" },
          { nome: "post_impressions_unique", tipo: "INT64", descricao: "Impressões únicas" },
          { nome: "post_impressions_paid", tipo: "INT64", descricao: "Impressões pagas" },
          { nome: "post_impressions_organic", tipo: "INT64", descricao: "Impressões orgânicas" },
          { nome: "post_clicks", tipo: "INT64", descricao: "Cliques na postagem" },
          { nome: "post_engagements", tipo: "INT64", descricao: "Engajamentos totais" },
          { nome: "post_activity", tipo: "INT64", descricao: "Atividade total (comentários + compartilhamentos + reações)" },
          { nome: "post_reactions_like_total", tipo: "INT64", descricao: "Curtidas totais" },
          { nome: "post_reactions_love_total", tipo: "INT64", descricao: "Reações 'love' totais" },
          { nome: "post_reactions_haha_total", tipo: "INT64", descricao: "Reações 'haha' totais" },
          { nome: "post_reactions_anger_total", tipo: "INT64", descricao: "Reações 'anger' totais" },
          { nome: "post_reactions_wow_total", tipo: "INT64", descricao: "Reações 'wow' totais" },
          { nome: "post_activity_by_action_type_comment", tipo: "INT64", descricao: "Comentários totais" },
          { nome: "post_activity_by_action_type_share", tipo: "INT64", descricao: "Compartilhamentos totais" },
          { nome: "post_video_views", tipo: "INT64", descricao: "Visualizações de vídeo totais" },
          { nome: "post_video_views_organic", tipo: "INT64", descricao: "Visualizações orgânicas de vídeo" },
          { nome: "area", tipo: "STRING", descricao: "Área do negócio" },
          { nome: "produto", tipo: "STRING", descricao: "Produto relacionado" },
          { nome: "origem", tipo: "STRING", descricao: "Origem da postagem" }
        ]
      }
    ]
  },
  {
    area: "Growth",
    dataset: "Midias_Instagram",
    tabelas: [
      {
        nome: "EngajamentoInstagram",
        descricao: "Dados de engajamento das postagens no Instagram",
        campos: [
          { nome: "cliente", tipo: "STRING", descricao: "Identificador do cliente" },
          { nome: "data", tipo: "DATE", descricao: "Data da publicação" },
          { nome: "post_id", tipo: "STRING", descricao: "ID da postagem" },
          { nome: "post_name", tipo: "STRING", descricao: "Nome da postagem" },
          { nome: "permalink_url", tipo: "STRING", descricao: "URL permanente da postagem" },
          { nome: "post_impressions", tipo: "INT64", descricao: "Total de impressões da postagem" },
          { nome: "post_impressions_unique", tipo: "INT64", descricao: "Impressões únicas" },
          { nome: "post_impressions_paid", tipo: "INT64", descricao: "Impressões pagas" },
          { nome: "post_impressions_organic", tipo: "INT64", descricao: "Impressões orgânicas" },
          { nome: "post_clicks", tipo: "INT64", descricao: "Cliques na postagem" },
          { nome: "post_engagements", tipo: "INT64", descricao: "Engajamentos totais" },
          { nome: "post_activity", tipo: "INT64", descricao: "Atividade total (comentários + compartilhamentos + reações)" },
          { nome: "post_reactions_like_total", tipo: "INT64", descricao: "Curtidas totais" },
          { nome: "post_reactions_love_total", tipo: "INT64", descricao: "Reações 'love' totais" },
          { nome: "post_reactions_haha_total", tipo: "INT64", descricao: "Reações 'haha' totais" },
          { nome: "post_reactions_anger_total", tipo: "INT64", descricao: "Reações 'anger' totais" },
          { nome: "post_reactions_wow_total", tipo: "INT64", descricao: "Reações 'wow' totais" },
          { nome: "post_activity_by_action_type_comment", tipo: "INT64", descricao: "Comentários totais" },
          { nome: "post_activity_by_action_type_share", tipo: "INT64", descricao: "Compartilhamentos totais" },
          { nome: "post_video_views", tipo: "INT64", descricao: "Visualizações de vídeo totais" },
          { nome: "post_video_views_organic", tipo: "INT64", descricao: "Visualizações orgânicas de vídeo" },
          { nome: "area", tipo: "STRING", descricao: "Área do negócio" },
          { nome: "produto", tipo: "STRING", descricao: "Produto relacionado" },
          { nome: "origem", tipo: "STRING", descricao: "Origem da postagem" }
        ]
      }
    ]
  },
  {
    area: "Growth",
    dataset: "ga4",
    tabelas: [
      {
        nome: "Consolidado_GA4",
        descricao: "Indicadores GA4",
        campos: [
          { nome: "data", tipo: "DATE", descricao: "Date of the event/record" },
          { nome: "pagepath", tipo: "STRING", descricao: "URL of the page" },
          { nome: "pagetitle", tipo: "STRING", descricao: "Title of the page" },
          { nome: "sessionmedium", tipo: "STRING", descricao: "Medium of the session" },
          { nome: "sessionsource", tipo: "STRING", descricao: "Source of the session" },
          { nome: "audiencename", tipo: "STRING", descricao: "Name of the audience" },
          { nome: "city", tipo: "STRING", descricao: "City of the user" },
          { nome: "devicecategory", tipo: "STRING", descricao: "Category of the device" },              
          { nome: "propertyid", tipo: "INT64", descricao: "ID of the property" },
          { nome: "sessions", tipo: "INT64", descricao: "Total sessions" },
          { nome: "screenpageviews", tipo: "INT64", descricao: "Total screen page views" }, 
         { nome: "activeusers", tipo: "INT64", descricao: "Total active users" },  
          { nome: "userengagementduration", tipo: "INT64", descricao: "Total user engagement duration" },
          { nome: "engagementrate", tipo: "FLOAT64", descricao: "Total engagement rate" },
          { nome: "conversions", tipo: "FLOAT64", descricao: "Total conversions" },
          { nome: "totalrevenue", tipo: "FLOAT64", descricao: "Total revenue" },
          { nome: "bouncerate", tipo: "FLOAT64", descricao: "Total bounce rate" },
          { nome: "area", tipo: "STRING", descricao: "Área do negócio" },
          { nome: "produto", tipo: "STRING", descricao: "Produto relacionado" },
          { nome: "origem", tipo: "STRING", descricao: "Origem da postagem" }
        ]
      }
    ]
  }
];
