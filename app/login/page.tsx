// app/login/page.tsx
"use client"

import { signIn } from "next-auth/react"
import Image from "next/image"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm text-center">
        <Image
          src="/logo-controlf5.png"
          alt="Control F5"
          width={120}
          height={40}
          className="mx-auto mb-6"
        />
        <h1 className="text-2xl font-semibold mb-4">Portal Business Intelligence</h1>
        <p className="mb-6">Só usuários @controlf5.com.br</p>
        <button
          onClick={() => signIn("google")}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Entrar com Google
        </button>
      </div>
    </div>
  )
}
