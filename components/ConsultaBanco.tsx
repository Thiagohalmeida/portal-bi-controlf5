import { useState } from "react";
import { metadados } from "@/data/metadados";
import { presets } from "@/data/presets";
import { gerarQuerySQL } from "@/lib/utils";

export default function ConsultaBanco() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Consulta Banco</h2>
      <p>Conteúdo da consulta ao banco de dados.</p>
    </div>
  );
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
      body: JSON.stringify({ dataset, tabela, sql })
    });
    const body = await res.json();
    setRows(body.rows || []);
  };

  const areas = [...new Set(metadados.map(m => m.area))];
  const datasetsDaArea = metadados.filter(m => m.area === area);
  const tabelasDoDataset = datasetsDaArea.find(d => d.dataset === dataset)?.tabelas || [];

  return (
    <div className="flex space-x-6">
      <div className="space-y-4">
        <select value={area} onChange={e => setArea(e.target.value)}>
          <option value="">Selecione a área</option>
          {areas.map((a: string) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select value={dataset} onChange={e => setDataset(e.target.value)} disabled={!area}>
          <option value="">Selecione o conjunto de dados</option>
          {datasetsDaArea.map((d) => (
            <option key={d.dataset} value={d.dataset}>{d.dataset}</option>
          ))}
        </select>

        <select value={tabela} onChange={e => setTabela(e.target.value)} disabled={!dataset}>
          <option value="">Selecione a tabela desejada</option>
          {tabelasDoDataset.map((t) => (
            <option key={t.nome} value={t.nome}>{t.nome}</option>
          ))}
        </select>

        <button className="bg-yellow-500 text-white px-4 py-2 rounded" onClick={handleGenerate}>
          Gerar SQL
        </button>
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleExecute}>
          Executar
        </button>
      </div>

      <pre className="flex-1 bg-gray-100 p-4 rounded overflow-auto">
        {sql}
      </pre>
    </div>
  );
}
