// components/Navbar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  return (
    <header className="bg-white shadow-md">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-controlf5.png"
              alt="Logo Control F5"
              width={160}
              height={40}
              priority
            />
          </Link>
          <nav className="flex space-x-4">
            <Link
              href="/"
              className="text-gray-700 hover:text-gray-900 font-medium"
            >
              Home
            </Link>
            <Link
              href="/insights"
              className="text-gray-700 hover:text-gray-900 font-medium"
            >
              Insights
            </Link>
          </nav>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
