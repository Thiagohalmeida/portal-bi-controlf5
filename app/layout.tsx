// app/layout.tsx
import "@/styles/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import Image from "next/image"
import ThemeToggle from "@/components/ThemeToggle"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <header className="flex items-center justify-between p-4 shadow-md">
            <Image src="/logo-controlf5.png" alt="Logo Control F5" width={160} height={40} priority />
            <ThemeToggle />
          </header>
          <main className="p-6">{children}</main>
          <footer className="mt-8 border-t py-4 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Control F5 – Todos os direitos reservados
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}
