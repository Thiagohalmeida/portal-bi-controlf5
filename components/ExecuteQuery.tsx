// components/ExecuteQuery.tsx
"use client";
import React, { useState } from "react";
import { metadados } from "@/data/metadados";
import {
  gerarQuerySQL,
  exportCSV,
  exportXLSX,
  copiarParaPrancheta,
} from "@/lib/utils";

// Flatten para campos do BQ que vêm como { value: ... }
function flattenRow(row: any) {
  const flat: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v && typeof v === "object" && (v as any).value !== undefined) {
      flat[k] = (v as any).value;
    } else {
      flat[k] = v;
    }
  }
  return flat;
}

export function ExecuteQuery() {
  const [area, setArea] = useState("");
  const [dataset, setDataset] = useState("");
  const [tabela, setTabela] = useState("");
  const [sql, setSql] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const areas = [...new Set(metadados.map((m) => m.area))];
  const datasetsDaArea = metadados.filter((m) => m.area === area);
  const tabelasDoDataset =
    datasetsDaArea.find((d) => d.dataset === dataset)?.tabelas || [];

  const handleGenerate = () => {
    setRows([]);
    setErr(null);
    if (!dataset || !tabela) return;
    setSql(gerarQuerySQL(dataset, tabela));
  };

  const handleExecute = async () => {
    setErr(null);
    setLoading(true);
    setRows([]);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sql }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao executar");

      const data = body.data || body.rows || [];
      setRows(data);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const rowsFlat = rows.map(flattenRow);

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex flex-col lg:flex-row lg:space-x-6 space-y-4 lg:space-y-0">
        <div className="space-y-4 w-full lg:w-1/3">
          <select
            value={area}
            onChange={(e) => {
              setArea(e.target.value);
              setDataset("");
              setTabela("");
              setSql("");
              setRows([]);
            }}
            className="w-full border p-2 rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            <option value="">Selecione a área</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <select
            value={dataset}
            onChange={(e) => {
              setDataset(e.target.value);
              setTabela("");
              setSql("");
              setRows([]);
            }}
            disabled={!area}
            className="w-full border p-2 rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            <option value="">Selecione o conjunto de dados</option>
            {datasetsDaArea.map((d) => (
              <option key={d.dataset} value={d.dataset}>
                {d.dataset}
              </option>
            ))}
          </select>

          <select
            value={tabela}
            onChange={(e) => {
              setTabela(e.target.value);
              setSql("");
              setRows([]);
            }}
            disabled={!dataset}
            className="w-full border p-2 rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            <option value="">Selecione a tabela</option>
            {tabelasDoDataset.map((t) => (
              <option key={t.nome} value={t.nome}>
                {t.nome}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={!tabela}
              className="flex-1 bg-yellow-500 text-black py-2 rounded hover:bg-yellow-400"
            >
              Gerar SQL
            </button>
            <button
              onClick={handleExecute}
              disabled={!sql || loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "Executando..." : "Executar"}
            </button>
          </div>

          {err && <p className="text-red-600 text-sm">{err}</p>}
        </div>

        <pre className="flex-1 bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto min-h-[120px] text-sm text-gray-900 dark:text-gray-100">
          {sql}
        </pre>
      </div>

      {rowsFlat.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">
            Resultado
          </h3>

          <div className="flex gap-2 mb-2">
            <button
              onClick={() => exportCSV(rowsFlat)}
              className="px-3 py-1 bg-green-500 text-white rounded"
            >
              CSV
            </button>
            <button
              onClick={() => exportXLSX(rowsFlat)}
              className="px-3 py-1 bg-green-700 text-white rounded"
            >
              XLSX
            </button>
            <button
              onClick={() =>
                copiarParaPrancheta(JSON.stringify(rowsFlat, null, 2))
              }
              className="px-3 py-1 bg-gray-600 text-white rounded"
            >
              Copiar JSON
            </button>
          </div>

          <div className="overflow-x-auto bg-white dark:bg-gray-800 border rounded">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-200 dark:bg-gray-700">
                <tr>
                  {Object.keys(rowsFlat[0]).map((c) => (
                    <th key={c} className="border p-2 whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowsFlat.map((r, i) => (
                  <tr key={i}>
                    {Object.values(r).map((v, j) => (
                      <td key={j} className="border p-1 whitespace-nowrap">
                        {String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}