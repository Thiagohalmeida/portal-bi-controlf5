// app/api/query/route.ts
import { NextRequest, NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";

/**
 * Em produção (Vercel), use credenciais via env:
 * - Opção A (recomendada): GOOGLE_APPLICATION_CREDENTIALS_JSON  (conteúdo completo do JSON do service account)
 * - Opção B: BQ_CLIENT_EMAIL + BQ_PRIVATE_KEY (com \n escapados)
 * Localmente também funciona com essas mesmas vars.
 */

function getBqClient() {
  const projectId =
    process.env.BQ_PROJECT_ID ||
    process.env.GCP_PROJECT_ID ||
    process.env.GCLOUD_PROJECT;

  if (!projectId) {
    throw new Error("BQ_PROJECT_ID não definido");
  }

  // Preferir JSON completo (GOOGLE_APPLICATION_CREDENTIALS_JSON)
  const jsonStr = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (jsonStr) {
    const credentials = JSON.parse(jsonStr);
    return new BigQuery({
      projectId,
      credentials,
      location: process.env.BQ_LOCATION || "US",
    });
  }

  // Fallback: e-mail + private key (com \n escapados)
  const client_email = process.env.BQ_CLIENT_EMAIL;
  let private_key = process.env.BQ_PRIVATE_KEY;

  if (!client_email || !private_key) {
    throw new Error(
      "Credenciais ausentes. Defina GOOGLE_APPLICATION_CREDENTIALS_JSON ou BQ_CLIENT_EMAIL e BQ_PRIVATE_KEY."
    );
  }

  // Importantíssimo: transformar '\n' literais em quebras reais
  private_key = private_key.replace(/\\n/g, "\n");

  return new BigQuery({
    projectId,
    credentials: { client_email, private_key },
    location: process.env.BQ_LOCATION || "US",
  });
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query) {
      return NextResponse.json(
        { error: "Query não fornecida" },
        { status: 400 }
      );
    }

    const bigquery = getBqClient();
    const [rows] = await bigquery.query(query);

    return NextResponse.json({ data: rows });
  } catch (error: any) {
    console.error("[/api/query] ERRO:", error);
    return NextResponse.json(
      { error: error.message || "Erro desconhecido" },
      { status: 500 }
    );
  }
}
