// app/api/query/route.ts
import { NextRequest, NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";
import {
  tableMap,
  buildFacts,
  calcPacing,
  fmt,
} from "@/lib/tableMap";
import { buildInsightSQL } from "@/lib/queryBuilder";

// 1) Config BigQuery
const projectId =
  process.env.BQ_PROJECT_ID ||
  process.env.GCP_PROJECT_ID ||
  "worlddata-439415";

const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  : undefined;

const bigquery = new BigQuery({ projectId, credentials });

// SQL building functions moved to lib/queryBuilder.ts

// Prompt building function moved to lib/makeInsightPrompt.ts
import { makeInsightPrompt } from "@/lib/makeInsightPrompt";

// 8) Handler
export async function POST(req: NextRequest) {
  try {
    const { originKey, dataInicio, dataFim, cliente } = await req.json();

    if (!originKey || !dataInicio || !dataFim) {
      return NextResponse.json(
        { error: "Parâmetros obrigatórios: originKey, dataInicio, dataFim" },
        { status: 400 }
      );
    }

    const entry = tableMap[originKey as keyof typeof tableMap];
    if (!entry) {
      return NextResponse.json({ error: "Origem inválida" }, { status: 400 });
    }

    const { sql, params } = buildInsightSQL(projectId, entry, dataInicio, dataFim, cliente);

    const [rows] = await bigquery.query({
      query: sql,
      params,
      location: process.env.BQ_LOCATION || "US",
    });

    // facts + prompt final já aqui (evita erros de "JSON ausente")
    const prompt = makeInsightPrompt({
      originKey: originKey as keyof typeof tableMap,
      rows,
      dataInicio,
      dataFim,
      cliente
    });
    
    // Extrair facts dos rows usando buildFacts
    const facts = buildFacts(rows, entry.metrics).map(f => ({ label: f.label, value: f.formatted }));
    
    // Verificar se é um caso de pacing
    let pacing;
    if (originKey === "PacingOrcamento") {
      const sum = (key: string) => rows.reduce((a, r) => a + (Number(r?.[key]) || 0), 0);
      const first = rows?.[0] || {};
      const orcamento = Number(first?.Orcamento_Total) || sum("Orcamento_Total") || 0;
      const gasto = Number(first?.Gasto_Acumulado) || sum("Gasto_Acumulado") || 0;

      const p = calcPacing({
        Orcamento_Total: orcamento,
        Gasto_Acumulado: gasto,
        Data_Inicio: dataInicio,
        Data_Fim: dataFim,
      });

      pacing = {
        dias_totais: p.dias_totais,
        dias_passados: p.dias_passados,
        dias_restantes: p.dias_restantes,
        burn_atual_dia: fmt.brl2(p.burn_atual_dia),
        burn_ideal_dia: fmt.brl2(p.burn_ideal_dia),
        dif_burn_dia: fmt.brl2(p.dif_burn_dia),
        orcamento_restante: fmt.brl2(p.orcamento_restante),
        "%_consumido": fmt.percent1(p.perc_consumido),
      };
    }

    return NextResponse.json({ data: rows, sql, facts, pacing, prompt });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro desconhecido" },
      { status: 500 }
    );
  }
}
