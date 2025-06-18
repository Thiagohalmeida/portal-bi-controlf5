// app/consulta-banco/page.tsx
"use client";

import PainelBI from "@/components/PainelBI";

export default function ConsultaBancoPage() {
  return (
    <div className="relative max-w-4xl mx-auto py-12 px-4">
      {/* Badge de versão */}
      <span className="absolute top-0 right-0 mt-4 mr-4 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
        v1.0
      </span>

      {/* Título único da página */}
      <h1 className="text-2xl font-semibold mb-8">Consulta Interativa</h1>

      {/* Aqui só entra o painel de query */}
      <PainelBI />
    </div>
  );
}
