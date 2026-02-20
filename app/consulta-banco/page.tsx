"use client";

import Link from "next/link";
import PainelBI from "@/components/PainelBI";

export default function ConsultaBancoPage() {
  return (
    <div className="relative w-full max-w-[1700px] mx-auto py-12 px-4 lg:px-8">
      <span className="absolute top-0 right-0 mt-4 mr-4 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
        v1.0
      </span>

      <div className="mb-8 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Consulta Interativa</h1>
        <Link
          href="/consulta-banco/catalogo"
          className="rounded bg-gray-900 text-white px-4 py-2 text-sm hover:bg-gray-700"
        >
          Gerenciar catalogo
        </Link>
      </div>

      <PainelBI />
    </div>
  );
}
