// pages/api/query.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { BigQuery } from "@google-cloud/bigquery";

// tenta carregar credenciais da variável de ambiente primeiro
let credentials;
if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
  credentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY);
} else {
  // só cai aqui em dev local se você tiver o arquivo em keys/
  const path = require("path");
  const fs = require("fs");
  const keyPath = path.join(process.cwd(), "keys", "bigquery‑sa2.json");
  credentials = JSON.parse(fs.readFileSync(keyPath, "utf‑8"));
}

const bigquery = new BigQuery({
  credentials,
  projectId: credentials.project_id,
  location: process.env.BQ_LOCATION ?? "US",
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Método não permitido");
  }

  const { query } = req.body;
  if (typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "Query inválida" });
  }

  try {
    const [job] = await bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();
    return res.status(200).json(rows);
  } catch (err: any) {
    console.error("Erro ao executar query:", err);
    return res.status(500).json({ error: err.message });
  }
}
