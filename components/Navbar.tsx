// components/Navbar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  return (
    <header className="bg-black text-white px-6 py-3 shadow flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center space-x-2 hover:opacity-80"
        >
          <Image
            src="/logo-controlf5.png"
            alt="Logo Control F5"
            width={36}
            height={36}
          />
          <span className="text-2xl font-bold tracking-wide">
            <span className="text-yellow-400">BI</span> Control F5
          </span>
        </Link>
      </div>

      <nav className="flex items-center space-x-6">
        <Link
          href="/consulta-banco"
          className="hover:text-yellow-400 transition-colors"
        >
          Consulta Banco
        </Link>

        <Link
          href="/insights"
          className="hover:text-yellow-400 transition-colors"
        >
          Insights
        </Link>

        <ThemeToggle />
      </nav>
    </header>
);
}
