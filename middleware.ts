// middleware.ts
import { withAuth } from "next-auth/middleware"

export default withAuth({
  // se não estiver logado, redireciona para /login
  pages: { signIn: "/login" },
})

export const config = {
  // só protege as rotas /consulta-banco/* e /insights/*
  matcher: ["/consulta-banco/:path*", "/insights/:path*"],
}
