// components/PainelBI.tsx
import { ExecuteQuery } from "./ExecuteQuery"

export default function PainelBI() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Consulta Interativa</h1>
      <ExecuteQuery />
    </main>
  )
}
