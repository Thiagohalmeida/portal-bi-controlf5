// app/page.tsx
"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center max-w-3xl mx-auto">
      {/* Badge de status + versão */}
      <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full mb-4 inline-block">
        Site em desenvolvimento • v1.0
      </span>

      <h1 className="text-4xl font-extrabold mb-4">
        Portal Business Intelligence – Ferramentas
      </h1>
      <p className="text-lg text-gray-700 mb-8">
        Democratizando o acesso aos dados, processos e análises para impulsionar decisões estratégicas em toda a empresa.
      </p>

      {/* Botões de acesso às páginas — já temos o menu no header, mas se quiser destacar aqui: */}
      <div className="space-x-4">
        <Link
          href="/consulta-banco"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
        >
          Consulta Banco
        </Link>
        <Link
          href="/insights"
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg"
        >
          Insights Automáticos
        </Link>
      </div>
    </main>
  );
}
