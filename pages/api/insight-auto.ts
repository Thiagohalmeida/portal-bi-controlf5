// pages/api/insight-auto.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { BigQuery } from "@google-cloud/bigquery";
import OpenAI from "openai";
import { tableMap } from "@/lib/tableMap";

type Success = { insight: string; raw: any[] };
type Failure = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Success | Failure>
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { table, dataInicio, dataFim, cliente } = req.body;
  if (!table || !dataInicio || !dataFim || !cliente) {
    return res
      .status(400)
      .json({ error: "Parâmetros obrigatórios: table, dataInicio, dataFim e cliente." });
  }

  const mapEntry = (tableMap as any)[table];
  if (!mapEntry) {
    return res.status(400).json({ error: `Tabela '${table}' não mapeada.` });
  }

  const {
    dataset,
    table: tableId,
    dateField,
    clientField,
    metrics,
    prompt: promptTemplate,
  } = mapEntry;

  // monta select
  const selects = [
    `DATE(${dateField}) AS data`,
    `${clientField} AS cliente`,
    ...metrics.map((m: string) => `SUM(${m}) AS ${m}`),
  ].join(",\n    ");

  // monta WHERE com named params
  const whereClauses = [
    `DATE(${dateField}) BETWEEN @dataInicio AND @dataFim`,
    `${clientField} = @cliente`,
  ].join("\n    AND ");

  const query = `
    SELECT
      ${selects}
    FROM \`${process.env.BQ_PROJECT_ID}.${dataset}.${tableId}\`
    WHERE
      ${whereClauses}
    GROUP BY data, cliente
    ORDER BY data
  `;

  const bq = new BigQuery({
    projectId: process.env.BQ_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    location: process.env.BQ_LOCATION,
  });

  try {
    const [rows] = await bq.query({
      query,
      params: { dataInicio, dataFim, cliente },
      location: process.env.BQ_LOCATION,
    });

    if (rows.length === 0) {
      return res
        .status(200)
        .json({ insight: "Nenhum dado encontrado.", raw: [] });
    }

    // monta prompt
    let prompt = promptTemplate
      .replace("{dataInicio}", dataInicio)
      .replace("{dataFim}", dataFim)
      + `\n\nCliente: ${cliente}\n`;

    rows.forEach((r: any) => {
      prompt += `\nData: ${r.data} — `;
      prompt += metrics.map((m: string) => `${m}: ${r[m]}`).join(" | ");
    });
    prompt += "\n\nGere insights objetivos e recomendações práticas.";

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const gptRes = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const insight = gptRes.choices[0]?.message?.content ?? "";

    return res.status(200).json({ insight, raw: rows });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Erro interno" });
  }
}
