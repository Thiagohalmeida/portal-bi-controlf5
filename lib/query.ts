// pages/api/query.ts
import { NextApiRequest, NextApiResponse } from "next"
import { BigQuery } from "@google-cloud/bigquery"
import path from "path"
import fs from "fs"

// Verifica se está no ambiente server-side
const isServer = typeof window === "undefined"

let bigquery: BigQuery

if (isServer) {
  const keyPath = path.join(process.cwd(), "keys", "bigquery-sa.json")
  const credentials = JSON.parse(fs.readFileSync(keyPath, "utf-8"))

  bigquery = new BigQuery({
    credentials,
    projectId: credentials.project_id,
    location: "US"
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Método não permitido")

  const { query } = req.body

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Query inválida" })
  }

  try {
    const [job] = await bigquery.createQueryJob({ query })
    const [rows] = await job.getQueryResults()
    res.status(200).json(rows)
  } catch (error: any) {
    console.error("Erro ao executar a query:", error)
    res.status(500).json({ error: "Erro ao executar a query", detail: error.message })
  }
}
