// app/insights/page.tsx
"use client";

import { useState } from "react";
import { tableMap } from "@/lib/tableMap";

export default function InsightsPage() {
  const [table, setTable] = useState<string>("");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [cliente, setCliente] = useState<string>("");
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInsight(null);
    setError(null);

    if (!table || !dataInicio || !dataFim || !cliente.trim()) {
      setError("Parâmetros obrigatórios: tabela, data início, data fim e cliente.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/insight-auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, dataInicio, dataFim, cliente }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Erro ao gerar insight.");
      } else {
        setInsight(body.insight);
      }
    } catch (err: any) {
      setError(err.message || "Erro de comunicação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <p className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full mb-4">
        Insights Automáticos • v1.0
      </p>
      <h1 className="text-2xl font-semibold mb-6">Gerar Insight Automático</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-lg shadow">
        {/* Origem (antes "Tabela") */}
        <div>
          <label htmlFor="table" className="block mb-1 font-medium text-gray-900 dark:text-gray-100">
            Origem <span className="text-red-500">*</span>
          </label>
          <select
            id="table"
            className="w-full border rounded px-3 py-2 bg-white text-black dark:bg-gray-800 dark:text-white"
            value={table}
            onChange={(e) => setTable(e.target.value)}
            required
          >
            <option value="">Selecione...</option>
            {Object.entries(tableMap).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Data Início */}
        <div>
          <label htmlFor="dataInicio" className="block mb-1 font-medium text-gray-900 dark:text-gray-100">
            Data Início <span className="text-red-500">*</span>
          </label>
          <input
            id="dataInicio"
            type="date"
            className="w-full border rounded px-3 py-2 bg-white text-black dark:bg-gray-800 dark:text-white"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            required
          />
        </div>

        {/* Data Fim */}
        <div>
          <label htmlFor="dataFim" className="block mb-1 font-medium text-gray-900 dark:text-gray-100">
            Data Fim <span className="text-red-500">*</span>
          </label>
          <input
            id="dataFim"
            type="date"
            className="w-full border rounded px-3 py-2 bg-white text-black dark:bg-gray-800 dark:text-white"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            required
          />
        </div>

        {/* Cliente */}
        <div>
          <label htmlFor="cliente" className="block mb-1 font-medium text-gray-900 dark:text-gray-100">
            Cliente <span className="text-red-500">*</span>
          </label>
          <input
            id="cliente"
            type="text"
            placeholder="Digite o nome do cliente"
            className="w-full border rounded px-3 py-2 bg-white text-black dark:bg-gray-800 dark:text-white"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Gerando..." : "Gerar Insight"}
        </button>

        {error && <p className="text-red-600 mt-2">{error}</p>}
      </form>

      {insight && (
        <div className="mt-8 bg-white dark:bg-gray-900 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Insight Gerado</h2>
          <pre className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">{insight}</pre>
        </div>
      )}
    </div>
  );
}
