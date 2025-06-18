import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // só aplica autenticação a essas rotas
  matcher: ["/consulta-banco/:path*", "/insights/:path*"],
};
