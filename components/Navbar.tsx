import React from "react"
import Image from "next/image"
import ThemeToggle from "./ThemeToggle"

export default function Navbar() {
  return (
    <header className="bg-black text-white px-6 py-3 shadow flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Image
          src="/logo-controlf5.png"
          alt="Logo Control F5"
          width={36}
          height={36}
        />
        <span className="text-2xl font-bold tracking-wide">
          <span className="text-yellow-400">BI</span> Control F5
        </span>
      </div>
      <ThemeToggle />
    </header>
  )
}
