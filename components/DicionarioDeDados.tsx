"use client"
import { useState } from "react"
import { metadados } from "../data/metadados"


export function DicionarioDeDados() {
  const [datasetSelecionado, setDatasetSelecionado] = useState("")
  const [tabelaSelecionada, setTabelaSelecionada] = useState("")

  const datasets = metadados.map((item) => item.dataset)
  const tabelas = metadados.find((item) => item.dataset === datasetSelecionado)?.tabelas || []
  const tabelaInfo = tabelas.find((t) => t.nome === tabelaSelecionada)

  return (
    <section className="mt-12">
      <h3 className="text-lg font-semibold mb-2">Dicionário de Dados</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 text-sm font-medium">Dataset:</label>
          <select
            className="w-full border px-3 py-2 rounded text-sm dark:bg-gray-800 dark:text-white"
            value={datasetSelecionado}
            onChange={(e) => {
              setDatasetSelecionado(e.target.value)
              setTabelaSelecionada("")
            }}
          >
            <option value="">-- Selecione --</option>
            {[...new Set(datasets)].map((ds) => (
              <option key={ds} value={ds}>{ds}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium">Tabela:</label>
          <select
            className="w-full border px-3 py-2 rounded text-sm dark:bg-gray-800 dark:text-white"
            value={tabelaSelecionada}
            onChange={(e) => setTabelaSelecionada(e.target.value)}
            disabled={!datasetSelecionado}
          >
            <option value="">-- Selecione --</option>
            {tabelas.map((t) => (
              <option key={t.nome} value={t.nome}>{t.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {tabelaInfo && (
        <div className="mt-6 border rounded p-4 bg-gray-50 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            <strong>Tabela:</strong> {tabelaInfo.nome} <br />
            <strong>Descrição:</strong> {tabelaInfo.descricao}
          </p>
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-200 dark:bg-gray-700">
              <tr>
                <th className="px-2 py-1 font-medium">Campo</th>
                <th className="px-2 py-1 font-medium">Tipo</th>
                <th className="px-2 py-1 font-medium">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {tabelaInfo.campos.map((campo, i) => (
                <tr key={i} className="border-t dark:border-gray-600">
                  <td className="px-2 py-1 font-mono text-blue-700 dark:text-blue-300">{campo.nome}</td>
                  <td className="px-2 py-1">{campo.tipo}</td>
                  <td className="px-2 py-1">{campo.descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
