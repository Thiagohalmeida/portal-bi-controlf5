import React from "react"

interface ResultadoTabelaProps {
  dados: any[]
}

const ResultadoTabela: React.FC<ResultadoTabelaProps> = ({ dados }) => {
  if (!dados.length) return <div>Nenhum resultado.</div>

  const colunas = Object.keys(dados[0])

  return (
    <table className="w-full border text-sm mt-4">
      <thead>
        <tr>
          {colunas.map((col) => (
            <th key={col} className="border px-2 py-1">{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {dados.map((linha, i) => (
          <tr key={i}>
            {colunas.map((col) => (
              <td key={col} className="border px-2 py-1">{String(linha[col])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default ResultadoTabela
