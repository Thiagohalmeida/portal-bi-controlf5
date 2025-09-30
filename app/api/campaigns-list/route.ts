// app/api/campaigns-list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";

const bigquery = new BigQuery({
  projectId: process.env.BQ_PROJECT_ID,
  credentials: {
    client_email: process.env.BQ_CLIENT_EMAIL,
    private_key: process.env.BQ_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");
    const cliente = searchParams.get("cliente");

    // Query para buscar campanhas com informações de cliente
    const query = `
      SELECT DISTINCT 
        cliente,
        campaign_id,
        campaign_name,
        campaign_status,
        COUNT(*) as total_records,
        SUM(CAST(impressions AS INT64)) as total_impressions,
        SUM(CAST(clicks AS INT64)) as total_clicks,
        SUM(CAST(spend AS FLOAT64)) as total_spend,
        MIN(data) as primeira_data,
        MAX(data) as ultima_data
      FROM \`${process.env.BQ_PROJECT_ID}.Ads.Google_Daily\`
      WHERE 1=1
        ${dataInicio ? "AND data >= @dataInicio" : ""}
        ${dataFim ? "AND data <= @dataFim" : ""}
        ${cliente ? "AND LOWER(TRIM(cliente)) LIKE LOWER(TRIM(@cliente))" : ""}
        AND campaign_name IS NOT NULL
        AND campaign_name != ''
        AND cliente IS NOT NULL
        AND cliente != ''
      GROUP BY cliente, campaign_id, campaign_name, campaign_status
      ORDER BY cliente, total_spend DESC
      LIMIT 200
    `;

    const options = {
      query,
      params: {
        ...(dataInicio && { dataInicio }),
        ...(dataFim && { dataFim }),
        ...(cliente && { cliente: `%${cliente}%` }),
      },
    };

    const [rows] = await bigquery.query(options);

    // Agrupar por cliente
    const campaignsByClient: Record<string, any[]> = {};
    
    rows.forEach((row: any) => {
      const clienteName = row.cliente;
      if (!campaignsByClient[clienteName]) {
        campaignsByClient[clienteName] = [];
      }
      
      campaignsByClient[clienteName].push({
        id: row.campaign_id,
        name: row.campaign_name,
        status: row.campaign_status,
        totalRecords: parseInt(row.total_records),
        totalImpressions: parseInt(row.total_impressions || 0),
        totalClicks: parseInt(row.total_clicks || 0),
        totalSpend: parseFloat(row.total_spend || 0),
        primeiraData: row.primeira_data,
        ultimaData: row.ultima_data,
      });
    });

    // Se foi especificado um cliente, retornar apenas as campanhas desse cliente
    if (cliente) {
      const clienteKey = Object.keys(campaignsByClient).find(key => 
        key.toLowerCase().includes(cliente.toLowerCase())
      );
      
      return NextResponse.json({ 
        campaigns: clienteKey ? campaignsByClient[clienteKey] : [],
        cliente: clienteKey || cliente
      });
    }

    // Retornar todos os clientes e suas campanhas
    return NextResponse.json({ campaignsByClient });
  } catch (error: any) {
    console.error("Erro ao buscar campanhas:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao buscar campanhas" },
      { status: 500 }
    );
  }
}