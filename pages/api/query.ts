// pages/api/query.ts
import { NextApiRequest, NextApiResponse } from "next"
import { BigQuery } from "@google-cloud/bigquery"

// Em produção, a chave de serviço fica em variável de ambiente GCP_SERVICE_ACCOUNT_KEY (JSON string)
// Em desenvolvimento local, podemos ler do arquivo keys/bigquery-sa2.json
import fs from "fs"
import path from "path"

// Carrega as credenciais
let credentials: any
if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
  credentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY)
} else {
  const keyPath = path.join(process.cwd(), "keys", "bigquery-sa2.json")
  credentials = JSON.parse(fs.readFileSync(keyPath, "utf-8"))
}

const bigquery = new BigQuery({
  projectId: credentials.project_id || process.env.GCP_PROJECT_ID,
  credentials,
  location: process.env.BQ_LOCATION || 'US'
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).end("Método não permitido")
  }

  const { query } = req.body
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Query inválida" })
  }

  try {
    const [job] = await bigquery.createQueryJob({ query })
    const [rows] = await job.getQueryResults()
    return res.status(200).json(rows)
  } catch (error: any) {
    console.error("Erro ao executar query:", error)
    return res.status(500).json({ error: "Erro ao executar a query", detail: error.message })
  }
}
