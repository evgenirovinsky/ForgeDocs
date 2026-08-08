import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { requireSession, tenantDb } from "@/server/session";
import {
  canManageDocumentGrants,
  isValidGrantPermission,
} from "@/server/document-access";
import { observeHttp } from "@/server/metrics";

const createGrantSchema = z.object({
  email: z.string().email(),
  permission: z.enum(["viewer", "editor"]).default("editor"),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const started = Date.now();
  const { id } = await params;
  const session = await requireSession();
  if (session instanceof NextResponse) {
    observeHttp("GET", "/api/documents/:id/grants", 401, (Date.now() - started) / 1000);
    return session;
  }

  const db = tenantDb(session);
  const document = await db.document.findFirst({ where: { id } });
  if (!document) {
    observeHttp("GET", "/api/documents/:id/grants", 404, (Date.now() - started) / 1000);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const grants = await prisma.documentGrant.findMany({
    where: { documentId: id },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  observeHttp("GET", "/api/documents/:id/grants", 200, (Date.now() - started) / 1000);
  return NextResponse.json({
    grants: grants.map((g) => ({
      id: g.id,
      permission: g.permission,
      userId: g.userId,
      email: g.user.email,
      name: g.user.name,
      createdAt: g.createdAt,
    })),
  });
}

export async function POST(request: Request, { params }: Params) {
  const started = Date.now();
  const { id } = await params;
  const session = await requireSession();
  if (session instanceof NextResponse) {
    observeHttp("POST", "/api/documents/:id/grants", 401, (Date.now() - started) / 1000);
    return session;
  }

  const db = tenantDb(session);
  const document = await db.document.findFirst({ where: { id } });
  if (!document) {
    observeHttp("POST", "/api/documents/:id/grants", 404, (Date.now() - started) / 1000);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canManageDocumentGrants(session, document)) {
    observeHttp("POST", "/api/documents/:id/grants", 403, (Date.now() - started) / 1000);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createGrantSchema.safeParse(body);
  if (!parsed.success || !isValidGrantPermission(parsed.data.permission)) {
    observeHttp("POST", "/api/documents/:id/grants", 400, (Date.now() - started) / 1000);
    return NextResponse.json(
      { error: parsed.success ? "Invalid permission" : parsed.error.flatten() },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    observeHttp("POST", "/api/documents/:id/grants", 404, (Date.now() - started) / 1000);
    return NextResponse.json(
      { error: "User not found in this tenant" },
      { status: 404 },
    );
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_tenantId: { userId: user.id, tenantId: session.tenantId },
    },
  });
  if (!membership) {
    observeHttp("POST", "/api/documents/:id/grants", 404, (Date.now() - started) / 1000);
    return NextResponse.json(
      { error: "User not found in this tenant" },
      { status: 404 },
    );
  }

  if (user.id === document.createdById) {
    observeHttp("POST", "/api/documents/:id/grants", 400, (Date.now() - started) / 1000);
    return NextResponse.json(
      { error: "Document creator already has full access" },
      { status: 400 },
    );
  }

  const grant = await prisma.documentGrant.upsert({
    where: {
      documentId_userId: { documentId: id, userId: user.id },
    },
    create: {
      documentId: id,
      userId: user.id,
      permission: parsed.data.permission,
      createdById: session.userId,
    },
    update: {
      permission: parsed.data.permission,
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  observeHttp("POST", "/api/documents/:id/grants", 200, (Date.now() - started) / 1000);
  return NextResponse.json({
    grant: {
      id: grant.id,
      permission: grant.permission,
      userId: grant.userId,
      email: grant.user.email,
      name: grant.user.name,
      createdAt: grant.createdAt,
    },
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const started = Date.now();
  const { id } = await params;
  const session = await requireSession();
  if (session instanceof NextResponse) {
    observeHttp("DELETE", "/api/documents/:id/grants", 401, (Date.now() - started) / 1000);
    return session;
  }

  const db = tenantDb(session);
  const document = await db.document.findFirst({ where: { id } });
  if (!document) {
    observeHttp("DELETE", "/api/documents/:id/grants", 404, (Date.now() - started) / 1000);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canManageDocumentGrants(session, document)) {
    observeHttp("DELETE", "/api/documents/:id/grants", 403, (Date.now() - started) / 1000);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const grantId = url.searchParams.get("grantId");
  if (!userId && !grantId) {
    observeHttp("DELETE", "/api/documents/:id/grants", 400, (Date.now() - started) / 1000);
    return NextResponse.json(
      { error: "userId or grantId required" },
      { status: 400 },
    );
  }

  const existing = await prisma.documentGrant.findFirst({
    where: {
      documentId: id,
      ...(grantId ? { id: grantId } : { userId: userId! }),
    },
  });
  if (!existing) {
    observeHttp("DELETE", "/api/documents/:id/grants", 404, (Date.now() - started) / 1000);
    return NextResponse.json({ error: "Grant not found" }, { status: 404 });
  }

  await prisma.documentGrant.delete({ where: { id: existing.id } });
  observeHttp("DELETE", "/api/documents/:id/grants", 200, (Date.now() - started) / 1000);
  return NextResponse.json({ ok: true });
}
