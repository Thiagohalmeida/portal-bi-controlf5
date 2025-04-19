import React from "react"
import { signIn } from "next-auth/react"

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-xl font-semibold mb-4">Acesso ao BI - Control F5</h1>
      <button onClick={() => signIn("google")}>
        Entrar com Google
      </button>
    </div>
  )
}
