// app/layout.tsx
import "@/styles/globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import Link from "next/link";
import Image from "next/image";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <ThemeProvider>
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
              {/* Logo à esquerda */}
              <Link href="/" className="flex items-center">
                <Image
                  src="/logo-controlf5.png"
                  alt="Control F5"
                  width={140}
                  height={36}
                  priority
                />
              </Link>

              {/* Menu à direita */}
              <nav className="flex space-x-6">
                <Link
                  href="/consulta-banco"
                  className="text-gray-700 hover:text-gray-900 font-medium"
                >
                  Consulta Banco
                </Link>
                <Link
                  href="/insights"
                  className="text-gray-700 hover:text-gray-900 font-medium"
                >
                  Insights Automáticos
                </Link>
              </nav>
            </div>
          </header>

          <main className="flex-grow">
            {children}
          </main>

          <footer className="bg-gray-50 border-t">
            <div className="max-w-7xl mx-auto py-4 text-center text-sm text-gray-500">
              © {new Date().getFullYear()} Control F5 – Todos os direitos reservados
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
