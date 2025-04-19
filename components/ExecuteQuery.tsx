// components/ExecuteQuery.tsx
"use client";
import React, { useState } from "react";
import { metadados, DatasetMetadado } from "@/data/metadados";
import { presets, Preset } from "@/data/presets";
import {
  gerarQuerySQL,
  exportCSV,
  exportXLSX,
  copiarParaPrancheta,
} from "@/lib/utils";

export function ExecuteQuery() {
  const [area, setArea] = useState("");
  const [dataset, setDataset] = useState("");
  const [tabela, setTabela] = useState("");
  const [sql, setSql] = useState("");
  const [resultado, setResultado] = useState<any[]>([]);
  const [descricao, setDescricao] = useState("");
  const [insight, setInsight] = useState("");

  const áreas = Array.from(new Set(metadados.map((m) => m.area)));
  const datasets = metadados.filter((m) => m.area === area);
  const tabelas = datasets.find((m) => m.dataset === dataset)?.tabelas || [];
  const presetsFiltrados = presets.filter(
    (p) => p.area === area && p.dataset === dataset && p.tabela === tabela
  );

  function handlePreset(p: Preset) {
    setSql(p.sql);
    setDescricao(p.descricao);
    setInsight(p.insight || "");
    setResultado([]);
  }

  function gerarSQL() {
    if (!area || !dataset || !tabela) return;
    const g = gerarQuerySQL(area, dataset, tabela, metadados);
    setSql(g);
    setDescricao("");
    setInsight("");
    setResultado([]);
  }

  async function executar() {
    if (!sql) return;
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sql }),
      });
      const data = await res.json();
      setResultado(data);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <section className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* filtros */}
      <div className="space-y-4 col-span-1">
        <select
          value={area}
          onChange={(e) => {
            setArea(e.target.value);
            setDataset("");
            setTabela("");
            setSql("");
            setResultado([]);
          }}
          className="w-full border p-2 rounded"
        >
          <option value="">Selecione a área</option>
          {áreas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select
          value={dataset}
          onChange={(e) => {
            setDataset(e.target.value);
            setTabela("");
            setSql("");
            setResultado([]);
          }}
          disabled={!area}
          className="w-full border p-2 rounded"
        >
          <option value="">Selecione o conjunto de dados</option>
          {datasets.map((d) => (
            <option key={d.dataset} value={d.dataset}>{d.dataset}</option>
          ))}
        </select>

        <select
          value={tabela}
          onChange={(e) => {
            setTabela(e.target.value);
            setSql("");
            setResultado([]);
          }}
          disabled={!dataset}
          className="w-full border p-2 rounded"
        >
          <option value="">Selecione a tabela desejada</option>
          {tabelas.map((t) => (
            <option key={t.nome} value={t.nome}>{t.nome}</option>
          ))}
        </select>

        {presetsFiltrados.length > 0 && (
          <select
            onChange={(e) => {
              const p = presetsFiltrados.find((p) => p.sql === e.target.value);
              if (p) handlePreset(p);
            }}
            className="w-full border p-2 rounded"
          >
            <option value="">-- Query pronta --</option>
            {presetsFiltrados.map((p, i) => (
              <option key={i} value={p.sql}>{p.descricao}</option>
            ))}
          </select>
        )}

        <div className="flex space-x-2">
          <button
            onClick={gerarSQL}
            disabled={!tabela}
            className="flex-1 bg-yellow-500 text-black py-2 rounded"
          >
            Gerar SQL
          </button>
          <button
            onClick={executar}
            disabled={!sql}
            className="flex-1 bg-blue-600 text-white py-2 rounded"
          >
            Executar
          </button>
        </div>
      </div>

      {/* SQL gerado */}
      {sql && (
        <pre className="col-span-2 bg-gray-100 p-4 rounded overflow-x-auto text-sm">
          {sql}
        </pre>
      )}

      {/* resultado e botões de export */}
      {resultado.length > 0 && (
        <div className="col-span-full space-y-4">
          <h3 className="font-semibold">Resultado gerado</h3>

          <div className="flex space-x-2">
            <button onClick={() => exportCSV(resultado)} className="px-3 py-1 bg-green-500 text-white rounded">CSV</button>
            <button onClick={() => exportXLSX(resultado)} className="px-3 py-1 bg-green-700 text-white rounded">XLSX</button>
            <button onClick={() => copiarParaPrancheta(JSON.stringify(resultado, null, 2))} className="px-3 py-1 bg-gray-600 text-white rounded">Copiar JSON</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  {Object.keys(resultado[0]).map((c) => (
                    <th key={c} className="border p-2">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultado.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="border p-1">{String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
