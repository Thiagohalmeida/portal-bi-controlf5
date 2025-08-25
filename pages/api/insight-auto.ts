import type { NextApiRequest, NextApiResponse } from "next";
import { BigQuery } from "@google-cloud/bigquery";
import OpenAI from "openai";
import { tableMap } from "@/lib/tableMap";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { table, dataInicio, dataFim, cliente } = req.body;
  if (!table || !dataInicio || !dataFim || !cliente) {
    return res.status(400).json({ error: "Parâmetros obrigatórios: table, dataInicio, dataFim e cliente" });
  }

  const mapEntry = (tableMap as any)[table];
  if (!mapEntry) {
    return res.status(400).json({ error: `Tabela '${table}' não mapeada.` });
  }

  const { dataset, table: tableId, dateField, clientField, metrics, prompt: promptTemplate } = mapEntry;
  const clienteFilter = cliente ? `AND ${clientField} = "${cliente}"` : "";

  const query = `
    SELECT
      ${clientField} AS cliente,
      ${metrics.map((m: string) => `SUM(${m}) AS ${m}`).join(",\n      ")}
    FROM \`${process.env.BQ_PROJECT_ID}.${dataset}.${tableId}\`
    WHERE ${dateField} BETWEEN '${dataInicio}' AND '${dataFim}'
    ${clienteFilter}
    GROUP BY cliente
  `;

  // Substitua esta linha:
  // const bq = new BigQuery({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS });
  // Por este bloco:
  const projectId = process.env.BQ_PROJECT_ID!;
  const clientEmail = process.env.BQ_CLIENT_EMAIL!;
  const privateKey = (process.env.BQ_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.error("BigQuery ENV missing:", {
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey,
    });
    return res.status(500).json({ error: "Credenciais do BigQuery ausentes ou inválidas." });
  }

  const bq = new BigQuery({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });
  const [rows] = await bq.query({ query });

  if (rows.length === 0) {
    return res.status(200).json({ insight: "Nenhum dado encontrado para o período selecionado." });
  }

  let prompt = promptTemplate
    .replace("{dataInicio}", dataInicio)
    .replace("{dataFim}", dataFim);

  rows.forEach((row: any) => {
    prompt += `\n\nCliente: ${row.cliente}`;
    metrics.forEach((m: string) => {
      prompt += ` | ${m}: ${row[m]}`;
    });
  });
  prompt += "\n\nGere insights objetivos e recomendações práticas de otimização.";

  const gptResp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3
  });

  const insight = gptResp.choices[0]?.message?.content || "Nenhum insight gerado.";
  return res.status(200).json({ insight, raw: rows });
}
