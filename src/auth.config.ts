import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const isLogin = pathname.startsWith("/login");
      const isPublic =
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/health") ||
        pathname.startsWith("/api/metrics") ||
        pathname.startsWith("/invites/accept");

      if (isPublic) return true;
      if (pathname.startsWith("/api/")) return true; // API routes enforce auth themselves
      if (isLogin) return isLoggedIn ? Response.redirect(new URL("/documents", request.nextUrl)) : true;
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
