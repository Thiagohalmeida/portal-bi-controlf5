// app/layout.tsx
import "@/styles/globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "BI Control F5",
  description: "Portal de BI Control F5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          {/* Navbar sempre visível */}
          <Navbar />

          {/* Conteúdo principal */}
          <main className="max-w-6xl mx-auto p-6">{children}</main>

          {/* Footer */}
          <footer className="mt-8 border-t py-4 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Control F5 – Todos os direitos reservados
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
