// app/api/query/route.ts
import { NextRequest, NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";

export const runtime = "nodejs"; // BigQuery precisa de Node runtime (não Edge)

/**
 * Instancia única do BigQuery usando as variáveis que você tem no Vercel.
 * Observação: convertemos \n para quebras reais no PEM.
 */
const projectId = process.env.BQ_PROJECT_ID!;
const clientEmail = process.env.BQ_CLIENT_EMAIL!;
const privateKey = (process.env.BQ_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  // Log útil em produção (aparece nos logs do Vercel)
  console.error("BigQuery ENV missing:", {
    hasProjectId: !!projectId,
    hasClientEmail: !!clientEmail,
    hasPrivateKey: !!privateKey,
  });
  // Não lançamos aqui para não derrubar o processo, mas o POST falhará com 500
}

const bq = new BigQuery({
  projectId,
  credentials: {
    client_email: clientEmail,
    private_key: privateKey,
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sql: string | undefined = body?.query || body?.sql;

    if (!sql || typeof sql !== "string" || !sql.trim()) {
      return NextResponse.json(
        { error: "Query não fornecida." },
        { status: 400 }
      );
    }

    const location = process.env.BQ_LOCATION || "US";

    // Executa a query no BigQuery
    const [job] = await bq.createQueryJob({
      query: sql,
      location,
    });

    const [rows] = await job.getQueryResults();

    // Padronizamos o retorno em { data: [...] }
    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (err: any) {
    console.error("BQ query error:", err?.message, err?.stack);
    return NextResponse.json(
      { error: "Erro ao executar consulta no BigQuery." },
      { status: 500 }
    );
  }
}
