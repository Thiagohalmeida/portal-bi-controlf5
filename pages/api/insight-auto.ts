import type { NextApiRequest, NextApiResponse } from "next";
import { BigQuery } from "@google-cloud/bigquery";
import OpenAI from "openai";
import { tableMap } from "@/lib/tableMap";

type InsightProvider = "openai" | "gemini" | "auto";
type ResolvedProvider = "openai" | "gemini";

function normalizeProvider(value: unknown): InsightProvider {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "openai" || raw === "gemini" || raw === "auto") {
    return raw;
  }

  const envRaw = String(process.env.INSIGHT_LLM_PROVIDER || "")
    .trim()
    .toLowerCase();
  if (envRaw === "openai" || envRaw === "gemini" || envRaw === "auto") {
    return envRaw;
  }

  return "auto";
}

function parseGeminiText(payload: any): string | null {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) continue;
    const text = parts
      .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();
    if (text) return text;
  }
  return null;
}

function normalizeGeminiModelName(model: string): string {
  return model.replace(/^models\//i, "").trim();
}

function canRetryWithAnotherGeminiModel(status: number, message: string): boolean {
  if (status === 404) return true;
  return /not found|not supported.*generatecontent/i.test(message);
}

async function tryGeminiGenerateContent(params: {
  apiKey: string;
  apiVersion: "v1" | "v1beta";
  model: string;
  prompt: string;
}): Promise<{ text: string; model: string; apiVersion: "v1" | "v1beta" }> {
  const endpoint = `https://generativelanguage.googleapis.com/${params.apiVersion}/models/${encodeURIComponent(
    params.model
  )}:generateContent?key=${encodeURIComponent(params.apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: params.prompt }] }],
      generationConfig: { temperature: 0.3 },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errMessage =
      payload?.error?.message ||
      `Gemini HTTP ${response.status} ${response.statusText || ""}`.trim();
    const err = new Error(errMessage) as Error & {
      retryable?: boolean;
      status?: number;
      model?: string;
      apiVersion?: string;
    };
    err.retryable = canRetryWithAnotherGeminiModel(response.status, errMessage);
    err.status = response.status;
    err.model = params.model;
    err.apiVersion = params.apiVersion;
    throw err;
  }

  const text = parseGeminiText(payload);
  if (!text) {
    const err = new Error("Gemini retornou resposta vazia.") as Error & { retryable?: boolean };
    err.retryable = false;
    throw err;
  }

  return { text, model: params.model, apiVersion: params.apiVersion };
}

async function generateWithOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY nao configurada.");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_INSIGHT_MODEL || "gpt-4o";

  const resp = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  const text = resp.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OpenAI retornou resposta vazia.");
  }

  return text;
}

async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY/GOOGLE_API_KEY nao configurada.");
  }

  const configuredModel = normalizeGeminiModelName(
    process.env.GEMINI_INSIGHT_MODEL || "gemini-2.5-flash"
  );
  const modelCandidates = Array.from(
    new Set([
      configuredModel,
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash-lite",
      "gemini-2.0-flash",
      "gemini-1.5-flash-latest",
    ])
  );
  const apiVersions: Array<"v1" | "v1beta"> = ["v1", "v1beta"];

  const attempts: Array<{ model: string; apiVersion: string; error: string }> = [];

  for (const apiVersion of apiVersions) {
    for (const model of modelCandidates) {
      try {
        const out = await tryGeminiGenerateContent({
          apiKey,
          apiVersion,
          model,
          prompt,
        });
        console.log("[insight-auto] Gemini respondeu com", {
          model: out.model,
          apiVersion: out.apiVersion,
        });
        return out.text;
      } catch (err: any) {
        attempts.push({
          model,
          apiVersion,
          error: err?.message || String(err),
        });

        if (!err?.retryable) {
          throw err;
        }
      }
    }
  }

  const attemptsSummary = attempts
    .map((a) => `${a.apiVersion}:${a.model} -> ${a.error}`)
    .join(" | ");
  throw new Error(
    `Nao foi possivel gerar insight com Gemini. Tentativas: ${attemptsSummary}`
  );
}

async function generateInsight(
  provider: InsightProvider,
  prompt: string
): Promise<{ insight: string; providerUsed: ResolvedProvider; fallbackFrom: ResolvedProvider | null }> {
  if (provider === "openai") {
    const insight = await generateWithOpenAI(prompt);
    return { insight, providerUsed: "openai", fallbackFrom: null };
  }

  if (provider === "gemini") {
    const insight = await generateWithGemini(prompt);
    return { insight, providerUsed: "gemini", fallbackFrom: null };
  }

  // auto: tenta OpenAI primeiro e cai para Gemini em caso de erro
  try {
    const insight = await generateWithOpenAI(prompt);
    return { insight, providerUsed: "openai", fallbackFrom: null };
  } catch (openAiError: any) {
    console.warn("[insight-auto] OpenAI falhou em modo auto. Tentando Gemini...", {
      error: openAiError?.message || String(openAiError),
    });
    const insight = await generateWithGemini(prompt);
    return { insight, providerUsed: "gemini", fallbackFrom: "openai" };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const {
      table,
      dataInicio,
      dataFim,
      cliente,
      pagepath,
      selectedCampaigns,
      provider,
    } = req.body;
    const requestedProvider = normalizeProvider(provider);

    if (!table || !dataInicio || !dataFim || !cliente) {
      return res
        .status(400)
        .json({ error: "Parametros obrigatorios: table, dataInicio, dataFim e cliente" });
    }

    const mapEntry = (tableMap as any)[table];
    if (!mapEntry) {
      return res.status(400).json({ error: `Tabela '${table}' nao mapeada.` });
    }

    const { dataset, table: tableId, dateField, clientField, metrics, prompt: promptTemplate } =
      mapEntry;

    let clienteFilter = "";
    if (cliente) {
      const clientes = cliente
        .split(",")
        .map((c: string) => c.trim())
        .filter((c: string) => c.length > 0);
      if (clientes.length === 1) {
        clienteFilter = `AND LOWER(TRIM(${clientField})) = LOWER(TRIM("${clientes[0]}"))`;
      } else if (clientes.length > 1) {
        const clientesList = clientes.map((c: string) => `LOWER(TRIM("${c}"))`).join(", ");
        clienteFilter = `AND LOWER(TRIM(${clientField})) IN (${clientesList})`;
      }
    }
    console.log("cliente recebido:", cliente);
    console.log("clienteFilter:", clienteFilter);

    const pagepathFilter = pagepath ? `AND pagepath = "${pagepath}"` : "";
    console.log("pagepathFilter:", pagepathFilter);

    let campaignFilter = "";
    if (table === "CampanhaGoogleAds" && selectedCampaigns && selectedCampaigns.length > 0) {
      console.log("selectedCampaigns recebidas:", selectedCampaigns);
      const campaignIds = selectedCampaigns.map((id: string) => id).join(", ");
      console.log("campaignIds processados:", campaignIds);
      campaignFilter = `AND campaign_id IN (${campaignIds})`;
      console.log("campaignFilter final:", campaignFilter);
    }

    const selectFields = [];
    const processedFields = new Set();

    for (const m of metrics) {
      if (processedFields.has(m.field)) continue;

      if (m.agg.type === "ratio") {
        selectFields.push(
          `SAFE_DIVIDE(SUM(SAFE_CAST(${m.agg.num} AS NUMERIC)), SUM(SAFE_CAST(${m.agg.den} AS NUMERIC))) AS ${m.field}`
        );

        if (!processedFields.has(m.agg.num)) {
          selectFields.push(`SUM(SAFE_CAST(${m.agg.num} AS NUMERIC)) AS ${m.agg.num}`);
          processedFields.add(m.agg.num);
        }
        if (!processedFields.has(m.agg.den)) {
          selectFields.push(`SUM(SAFE_CAST(${m.agg.den} AS NUMERIC)) AS ${m.agg.den}`);
          processedFields.add(m.agg.den);
        }
      } else if (m.agg.type === "avg" && m.agg.weightBy) {
        selectFields.push(
          `SAFE_DIVIDE(SUM(SAFE_CAST(${m.field} AS NUMERIC) * SAFE_CAST(${m.agg.weightBy} AS NUMERIC)), SUM(SAFE_CAST(${m.agg.weightBy} AS NUMERIC))) AS ${m.field}`
        );

        if (!processedFields.has(m.agg.weightBy)) {
          selectFields.push(`SUM(SAFE_CAST(${m.agg.weightBy} AS NUMERIC)) AS ${m.agg.weightBy}`);
          processedFields.add(m.agg.weightBy);
        }
      } else if (m.agg.type === "avg") {
        selectFields.push(`AVG(SAFE_CAST(${m.field} AS NUMERIC)) AS ${m.field}`);
      } else if (m.agg.type === "sum") {
        selectFields.push(`SUM(SAFE_CAST(${m.field} AS NUMERIC)) AS ${m.field}`);
      }

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
      ${campaignFilter}
      GROUP BY cliente
    `;

    console.log("Query SQL completa:", query);

    const projectId = process.env.BQ_PROJECT_ID!;
    const clientEmail = process.env.BQ_CLIENT_EMAIL!;
    const privateKey = (process.env.BQ_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      console.error("BigQuery ENV missing:", {
        hasProjectId: !!projectId,
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKey,
      });
      return res.status(500).json({ error: "Credenciais do BigQuery ausentes ou invalidas." });
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
      return res.status(200).json({
        insight: "Nenhum dado encontrado para o periodo selecionado.",
        providerRequested: requestedProvider,
        providerUsed: null,
        fallbackFrom: null,
      });
    }

    let prompt = promptTemplate
      .replace("{dataInicio}", dataInicio)
      .replace("{dataFim}", dataFim)
      .replace("{cliente}", cliente);

    if (pagepath) {
      prompt = prompt.replace("{pagepath}", pagepath);
    }

    if (table === "CampanhaGoogleAds" && selectedCampaigns && selectedCampaigns.length > 0) {
      prompt += `\n\nNOTA: Esta analise considera apenas as campanhas selecionadas (${selectedCampaigns.length} campanhas especificas) e nao todas as campanhas do cliente.`;
    }

    rows.forEach((row: any) => {
      prompt += `\n\nCliente: ${row.cliente}`;
      metrics.forEach((m: { field: string; label: string }) => {
        const fieldName = m.field;
        const fieldLabel = m.label;
        prompt += ` | ${fieldLabel}: ${row[fieldName] ?? "N/A"}`;
      });
    });
    prompt += "\n\nGere insights objetivos e recomendacoes praticas de otimizacao.";

    const generated = await generateInsight(requestedProvider, prompt);

    console.log("[insight-auto] Dados processados:", {
      providerRequested: requestedProvider,
      providerUsed: generated.providerUsed,
      fallbackFrom: generated.fallbackFrom,
      clienteInfo: rows.map((r) => r.cliente),
      pagepath: pagepath || "Todos",
      campanhasSelecionadas: selectedCampaigns
        ? `${selectedCampaigns.length} campanhas especificas`
        : "Todas as campanhas",
      metricasDisponiveis: metrics.map((m: {
        field: string;
        label: string;
        agg: { type: string };
      }) => ({ campo: m.field, label: m.label, tipo: m.agg.type })),
      valoresEncontrados: rows.map((r) => {
        const valores: Record<string, any> = {};
        metrics.forEach((m: { field: string }) => {
          valores[m.field] = r[m.field];
        });
        return valores;
      }),
      promptGerado: prompt,
    });

    return res.status(200).json({
      insight: generated.insight,
      raw: rows,
      debug: { prompt },
      providerRequested: requestedProvider,
      providerUsed: generated.providerUsed,
      fallbackFrom: generated.fallbackFrom,
    });
  } catch (error: any) {
    console.error("[insight-auto] ERRO:", error);
    return res.status(500).json({ error: error.message || "Erro desconhecido" });
  }
}
