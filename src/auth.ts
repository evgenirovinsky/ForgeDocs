import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import * as bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/server/db";
import { authConfig } from "@/auth.config";
import { credentialsLoginEnabled } from "@/server/auth-flags";
import type { JWT } from "@auth/core/jwt";

export type AppUserClaims = {
  id: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  role: Role;
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      tenantId: string;
      tenantSlug: string;
      tenantName: string;
      role: Role;
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface User extends AppUserClaims {}
}

declare module "@auth/core/jwt" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface JWT extends AppUserClaims {}
}

async function loadPrimaryMembership(userId: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    include: { tenant: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) {
    throw new Error("User has no tenant membership");
  }
  return membership;
}

type AuthProviders = NonNullable<
  import("next-auth").NextAuthConfig["providers"]
>;

const providers: AuthProviders = [];

if (credentialsLoginEnabled()) {
  providers.push(
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (
          !email ||
          !password ||
          typeof email !== "string" ||
          typeof password !== "string"
        ) {
          return null;
        }

        if (process.env.AUTH_E2E_BYPASS === "true" && password === "e2e-bypass") {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user) return null;
          const membership = await loadPrimaryMembership(user.id);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            tenantId: membership.tenantId,
            tenantSlug: membership.tenant.slug,
            tenantName: membership.tenant.name,
            role: membership.role,
          };
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        const membership = await loadPrimaryMembership(user.id);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: membership.tenantId,
          tenantSlug: membership.tenant.slug,
          tenantName: membership.tenant.name,
          role: membership.role,
        };
      },
    }),
  );
}

if (
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
  process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET
) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider === "microsoft-entra-id") {
        const email =
          user.email ??
          (typeof profile?.email === "string" ? profile.email : null);
        const oid =
          (profile as { oid?: string } | undefined)?.oid ??
          account.providerAccountId;

        if (!email) return false;

        let dbUser = await prisma.user.findFirst({
          where: {
            OR: [{ azureOid: oid }, { email }],
          },
        });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name ?? email,
              azureOid: oid,
            },
          });
        } else if (!dbUser.azureOid) {
          dbUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: { azureOid: oid, name: user.name ?? dbUser.name },
          });
        }

        const membership = await prisma.membership.findFirst({
          where: { userId: dbUser.id },
          include: { tenant: true },
        });
        if (!membership) {
          return false;
        }

        user.id = dbUser.id;
        user.email = dbUser.email;
        user.name = dbUser.name;
        (user as AppUserClaims).tenantId = membership.tenantId;
        (user as AppUserClaims).tenantSlug = membership.tenant.slug;
        (user as AppUserClaims).tenantName = membership.tenant.name;
        (user as AppUserClaims).role = membership.role;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const claims = user as AppUserClaims;
        token.id = claims.id;
        token.tenantId = claims.tenantId;
        token.tenantSlug = claims.tenantSlug;
        token.tenantName = claims.tenantName;
        token.role = claims.role;
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as JWT & AppUserClaims;
      session.user = {
        ...session.user,
        id: t.id,
        tenantId: t.tenantId,
        tenantSlug: t.tenantSlug,
        tenantName: t.tenantName,
        role: t.role,
      };
      return session;
    },
  },
});
