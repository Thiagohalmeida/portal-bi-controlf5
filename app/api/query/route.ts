// app/api/query/route.ts

import { NextRequest, NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";

// Use sua configuração correta aqui:
const projectId = process.env.GCP_PROJECT_ID!;
const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS!; // ou use o JSON direto via GOOGLE_APPLICATION_CREDENTIALS_JSON

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query) return NextResponse.json({ error: "Query não fornecida" }, { status: 400 });

    // Inicializa o BigQuery
    const bigquery = new BigQuery({
      projectId,
      keyFilename,
      // Se usar chave JSON em variável, use:
      // credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!)
    });

    // Executa a consulta
    const [rows] = await bigquery.query(query);

    return NextResponse.json({ data: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro desconhecido" }, { status: 500 });
  }
}
