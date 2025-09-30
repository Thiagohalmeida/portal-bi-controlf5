// app/api/clients/route.ts
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
    const search = searchParams.get("search");

    // Query para buscar clientes únicos
    const query = `
      SELECT DISTINCT 
        cliente,
        COUNT(DISTINCT campaign_id) as total_campaigns,
        SUM(CAST(impressions AS INT64)) as total_impressions,
        SUM(CAST(clicks AS INT64)) as total_clicks,
        SUM(CAST(spend AS FLOAT64)) as total_spend,
        MIN(data) as primeira_data,
        MAX(data) as ultima_data
      FROM \`${process.env.BQ_PROJECT_ID}.Ads.Google_Daily\`
      WHERE 1=1
        ${dataInicio ? "AND data >= @dataInicio" : ""}
        ${dataFim ? "AND data <= @dataFim" : ""}
        ${search ? "AND LOWER(TRIM(cliente)) LIKE LOWER(TRIM(@search))" : ""}
        AND cliente IS NOT NULL
        AND cliente != ''
      GROUP BY cliente
      ORDER BY total_spend DESC
      LIMIT 50
    `;

    const options = {
      query,
      params: {
        ...(dataInicio && { dataInicio }),
        ...(dataFim && { dataFim }),
        ...(search && { search: `%${search}%` }),
      },
    };

    const [rows] = await bigquery.query(options);

    const clients = rows.map((row: any) => ({
      name: row.cliente,
      totalCampaigns: parseInt(row.total_campaigns),
      totalImpressions: parseInt(row.total_impressions || 0),
      totalClicks: parseInt(row.total_clicks || 0),
      totalSpend: parseFloat(row.total_spend || 0),
      primeiraData: row.primeira_data,
      ultimaData: row.ultima_data,
    }));

    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error("Erro ao buscar clientes:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao buscar clientes" },
      { status: 500 }
    );
  }
}