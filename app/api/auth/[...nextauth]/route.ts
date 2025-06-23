// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      // Só permitir emails @controlf5.com.br
      if (user.email?.endsWith("@controlf5.com.br")) {
        return true
      }
      return false
    },
    async session({ session, user }) {
      // opcional: adicionar dados extras na session
      return session
    },
  },
})

export { handler as GET, handler as POST }
