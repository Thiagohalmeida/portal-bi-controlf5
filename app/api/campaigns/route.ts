// app/api/campaigns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cliente = searchParams.get("cliente");
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");

    if (!cliente) {
      return NextResponse.json({ error: "Cliente é obrigatório" }, { status: 400 });
    }

    // Query para buscar campanhas disponíveis para o cliente
    const query = `
      SELECT DISTINCT 
        campaign_id,
        campaign_name,
        campaign_status,
        COUNT(*) as total_records,
        SUM(CAST(impressions AS INT64)) as total_impressions,
        SUM(CAST(clicks AS INT64)) as total_clicks,
        SUM(CAST(spend AS FLOAT64)) as total_spend
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.Ads.Google_Daily\`
      WHERE cliente = @cliente
        ${dataInicio ? "AND data >= @dataInicio" : ""}
        ${dataFim ? "AND data <= @dataFim" : ""}
        AND campaign_name IS NOT NULL
        AND campaign_name != ''
      GROUP BY campaign_id, campaign_name, campaign_status
      ORDER BY total_spend DESC
      LIMIT 50
    `;

    const options = {
      query,
      params: {
        cliente,
        ...(dataInicio && { dataInicio }),
        ...(dataFim && { dataFim }),
      },
    };

    const [rows] = await bigquery.query(options);

    const campaigns = rows.map((row: any) => ({
      id: row.campaign_id,
      name: row.campaign_name,
      status: row.campaign_status,
      totalRecords: parseInt(row.total_records),
      totalImpressions: parseInt(row.total_impressions || 0),
      totalClicks: parseInt(row.total_clicks || 0),
      totalSpend: parseFloat(row.total_spend || 0),
    }));

    return NextResponse.json({ campaigns });
  } catch (error: any) {
    console.error("Erro ao buscar campanhas:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao buscar campanhas" },
      { status: 500 }
    );
  }
}