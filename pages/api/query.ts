// pages/api/query.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { BigQuery } from "@google-cloud/bigquery";

const bigquery = new BigQuery({
  projectId: process.env.BQ_PROJECT_ID,
  location: process.env.BQ_LOCATION,
  credentials: {
    client_email: process.env.BQ_CLIENT_EMAIL!,
    // se as quebras de linha vierem como literais “\n”:
    private_key: process.env.BQ_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });

  const { query } = req.body as { query?: string };
  if (!query) {
    return res.status(400).json({ error: "Query inválida" });
  }

  try {
    const [job] = await bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();
    return res.status(200).json(rows);
  } catch (e: any) {
    console.error("Erro ao executar query:", e);
    return res.status(500).json({ error: e.message });
  }
}
