import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createTenantPrisma } from "@/server/db";
import { canWriteDocuments } from "@/server/rbac";
import type { Role } from "@prisma/client";

export type AppSession = {
  userId: string;
  email: string;
  name: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  role: Role;
};

export async function requireSession(): Promise<AppSession | NextResponse> {
  const session = await auth();
  if (!session?.user?.id || !session.user.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return {
    userId: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    tenantId: session.user.tenantId,
    tenantSlug: session.user.tenantSlug,
    tenantName: session.user.tenantName,
    role: session.user.role,
  };
}

export function tenantDb(session: AppSession) {
  return createTenantPrisma({ tenantId: session.tenantId });
}

export function forbidUnlessWriter(session: AppSession): NextResponse | null {
  if (!canWriteDocuments(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
