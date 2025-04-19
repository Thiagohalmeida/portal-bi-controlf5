// components/ThemeToggle.tsx
"use client"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null  // evita flash de tema incorreto

  const isDark = theme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`px-3 py-1 rounded border transition ${
        isDark
          ? "bg-white text-black hover:bg-gray-200"
          : "bg-gray-800 text-white hover:bg-gray-700"
      }`}
    >
      {isDark ? "Modo Claro" : "Modo Escuro"}
    </button>
  )
}
