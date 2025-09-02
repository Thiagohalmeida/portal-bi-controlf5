import type { NextApiRequest, NextApiResponse } from "next";
import { BigQuery } from "@google-cloud/bigquery";
import OpenAI from "openai";
import { tableMap } from "@/lib/tableMap";
import { getPagePathByPropertyId } from "@/lib/propertyIdToPagePathMap";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

    const { table, dataInicio, dataFim, cliente, pagepath } = req.body;
    if (!table || !dataInicio || !dataFim || !cliente) {
      return res.status(400).json({ error: "Parâmetros obrigatórios: table, dataInicio, dataFim e cliente" });
    }

    const mapEntry = (tableMap as any)[table];
    if (!mapEntry) {
      return res.status(400).json({ error: `Tabela '${table}' não mapeada.` });
    }

    const { dataset, table: tableId, dateField, clientField, metrics, prompt: promptTemplate } = mapEntry;
    const clienteFilter = cliente ? `AND LOWER(TRIM(${clientField})) = LOWER(TRIM("${cliente}"))` : "";
    
    // Adiciona filtro de pagepath se fornecido
    const pagepathFilter = pagepath ? `AND pagepath = "${pagepath}"` : "";

    // Vamos processar as métricas diretamente na consulta SQL

    // Prepare calculated fields for the SELECT clause
    const selectFields = [];
    const processedFields = new Set(); // Track fields that have been processed
    
    // We'll handle all fields through the metrics loop instead of adding base fields separately
    
    // Process all metrics (sum, avg, ratio)
    for (const m of metrics) {
      // Skip if we've already processed this field
      if (processedFields.has(m.field)) continue;
      
      if (m.agg.type === "ratio") {
        // Calculate the ratio directly in SQL
        selectFields.push(`SAFE_DIVIDE(SUM(SAFE_CAST(${m.agg.num} AS NUMERIC)), SUM(SAFE_CAST(${m.agg.den} AS NUMERIC))) AS ${m.field}`);
        
        // Add base fields if they're not already included
        if (!processedFields.has(m.agg.num)) {
          selectFields.push(`SUM(SAFE_CAST(${m.agg.num} AS NUMERIC)) AS ${m.agg.num}`);
          processedFields.add(m.agg.num);
        }
        if (!processedFields.has(m.agg.den)) {
          selectFields.push(`SUM(SAFE_CAST(${m.agg.den} AS NUMERIC)) AS ${m.agg.den}`);
          processedFields.add(m.agg.den);
        }
      } else if (m.agg.type === "avg" && m.agg.weightBy) {
        // Calculate weighted average
        selectFields.push(`SAFE_DIVIDE(SUM(SAFE_CAST(${m.field} AS NUMERIC) * SAFE_CAST(${m.agg.weightBy} AS NUMERIC)), SUM(SAFE_CAST(${m.agg.weightBy} AS NUMERIC))) AS ${m.field}`);
        
        // Add weight field if not already included
        if (!processedFields.has(m.agg.weightBy)) {
          selectFields.push(`SUM(SAFE_CAST(${m.agg.weightBy} AS NUMERIC)) AS ${m.agg.weightBy}`);
          processedFields.add(m.agg.weightBy);
        }
      } else if (m.agg.type === "avg") {
        // Calculate simple average (using AVG function)
        selectFields.push(`AVG(SAFE_CAST(${m.field} AS NUMERIC)) AS ${m.field}`);
      } else if (m.agg.type === "sum") {
        // Simple sum
        selectFields.push(`SUM(SAFE_CAST(${m.field} AS NUMERIC)) AS ${m.field}`);
      }
      
      // Mark this field as processed
      processedFields.add(m.field);
    }

    const query = `
      SELECT
        ${clientField} AS cliente,
        ${selectFields.join(",\n      ")}
      FROM \`${process.env.BQ_PROJECT_ID}.${dataset}.${tableId}\`
      WHERE ${dateField} BETWEEN '${dataInicio}' AND '${dataFim}'
      ${clienteFilter}
      ${pagepathFilter}
      GROUP BY cliente
    `;

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
      
    // Adiciona informação sobre pagepath no prompt se fornecido
    if (pagepath) {
      prompt = prompt.replace("{pagepath}", pagepath);
    }

    rows.forEach((row: any) => {
      prompt += `\n\nCliente: ${row.cliente}`;
      metrics.forEach((m: { field: string; label: string; agg: { type: string } }) => {
        // Usar o nome do campo como chave para acessar o valor na linha
        // e o label para exibição no prompt
        const fieldName = m.field;
        const fieldLabel = m.label;
        prompt += ` | ${fieldLabel}: ${row[fieldName] ?? 'N/A'}`;
      });
    });
    prompt += "\n\nGere insights objetivos e recomendações práticas de otimização.";

    const gptResp = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3
    });

    // Log para depuração
    console.log("[insight-auto] Dados processados:", {
      clienteInfo: rows.map(r => r.cliente),
      pagepath: pagepath || "Todos",
      metricasDisponiveis: metrics.map((m: { field: string; label: string; agg: { type: string } }) => ({ campo: m.field, label: m.label, tipo: m.agg.type })),
      valoresEncontrados: rows.map(r => {
        const valores: Record<string, any> = {};
        metrics.forEach((m: { field: string }) => {
          valores[m.field] = r[m.field];
        });
        return valores;
      }),
      promptGerado: prompt
    });
    
    const insight = gptResp.choices[0]?.message?.content || "Nenhum insight gerado.";
    return res.status(200).json({ insight, raw: rows, debug: { prompt } });
  } catch (error: any) {
    console.error("[insight-auto] ERRO:", error);
    return res.status(500).json({ error: error.message || "Erro desconhecido" });
  }
}
