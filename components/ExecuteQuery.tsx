// components/ExecuteQuery.tsx
"use client";
import React, { useState } from "react";
import { metadados } from "@/data/metadados";
import { presets, Preset } from "@/data/presets";
import {
  gerarQuerySQL,
  exportCSV,
  exportXLSX,
  copiarParaPrancheta,
} from "@/lib/utils";

// Função para "flatten" dos campos do tipo { value: ... }
function flattenRow(row: any) {
  const flat: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value && typeof value === "object" && (value as any).value !== undefined) {
      flat[key] = (value as any).value;
    } else {
      flat[key] = value;
    }
  }
  return flat;
}

export function ExecuteQuery() {
  const [area, setArea] = useState<string>("");
  const [dataset, setDataset] = useState<string>("");
  const [tabela, setTabela] = useState<string>("");
  const [sql, setSql] = useState<string>("");
  const [rows, setRows] = useState<any[]>([]);

  const handleGenerate = () => {
    setSql(gerarQuerySQL(dataset, tabela));
  };

  const handleExecute = async () => {
    const res = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: sql })
    });
    const body = await res.json();
    setRows(body.data || body.rows || []);
  };

  const areas = [...new Set(metadados.map(m => m.area))];
  const datasetsDaArea = metadados.filter(m => m.area === area);
  const tabelasDoDataset = datasetsDaArea.find(d => d.dataset === dataset)?.tabelas || [];

  // Tabela flatten
  const rowsFlat = rows.map(flattenRow);

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex flex-col lg:flex-row lg:space-x-6 space-y-4 lg:space-y-0">
        <div className="space-y-4 w-full lg:w-1/3">
          <select value={area} onChange={e => setArea(e.target.value)} className="w-full border p-2 rounded bg-white text-black dark:bg-gray-800 dark:text-white">
            <option value="">Selecione a área</option>
            {areas.map((a: string) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select value={dataset} onChange={e => setDataset(e.target.value)} disabled={!area} className="w-full border p-2 rounded bg-white text-black dark:bg-gray-800 dark:text-white">
            <option value="">Selecione o conjunto de dados</option>
            {datasetsDaArea.map((d) => (
              <option key={d.dataset} value={d.dataset}>{d.dataset}</option>
            ))}
          </select>

          <select value={tabela} onChange={e => setTabela(e.target.value)} disabled={!dataset} className="w-full border p-2 rounded bg-white text-black dark:bg-gray-800 dark:text-white">
            <option value="">Selecione a tabela desejada</option>
            {tabelasDoDataset.map((t) => (
              <option key={t.nome} value={t.nome}>{t.nome}</option>
            ))}
          </select>

          <div className="flex space-x-2">
            <button className="flex-1 bg-yellow-500 text-black py-2 rounded hover:bg-yellow-400 dark:bg-yellow-400 dark:text-black dark:hover:bg-yellow-300 transition" onClick={handleGenerate}>
              Gerar SQL
            </button>
            <button className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-500 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-400 transition" onClick={handleExecute}>
              Executar
            </button>
          </div>
        </div>
        <pre className="flex-1 bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto min-h-[120px] text-sm text-gray-900 dark:text-gray-100">
          {sql}
        </pre>
      </div>

      {/* Resultado */}
      {rowsFlat.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Resultado gerado</h3>
          <div className="flex space-x-2 mb-2">
            <button onClick={() => exportCSV(rowsFlat)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-400 dark:bg-green-600 dark:hover:bg-green-500">CSV</button>
            <button onClick={() => exportXLSX(rowsFlat)} className="px-3 py-1 bg-green-700 text-white rounded hover:bg-green-600 dark:bg-green-800 dark:hover:bg-green-700">XLSX</button>
            <button onClick={() => copiarParaPrancheta(JSON.stringify(rowsFlat, null, 2))} className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600">Copiar JSON</button>
          </div>
          <div className="overflow-x-auto bg-white dark:bg-gray-800 border rounded">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-200 dark:bg-gray-700">
                <tr>
                  {Object.keys(rowsFlat[0]).map(col => (
                    <th key={col} className="border p-2 whitespace-nowrap text-gray-900 dark:text-gray-100">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowsFlat.map((row, i) => (
                  <tr key={i} className="bg-white dark:bg-gray-800">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="border p-1 whitespace-nowrap text-gray-900 dark:text-gray-100">{String(v)}</td>
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