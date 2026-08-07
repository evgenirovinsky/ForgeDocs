import { NextResponse } from "next/server";
import { z } from "zod";
import {
  forbidUnlessWriter,
  requireSession,
  tenantDb,
} from "@/server/session";
import { observeHttp } from "@/server/metrics";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.unknown().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const started = Date.now();
  const { id } = await params;
  const session = await requireSession();
  if (session instanceof NextResponse) {
    observeHttp("GET", "/api/documents/:id", 401, (Date.now() - started) / 1000);
    return session;
  }

  const db = tenantDb(session);
  const document = await db.document.findFirst({ where: { id } });
  if (!document) {
    observeHttp("GET", "/api/documents/:id", 404, (Date.now() - started) / 1000);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  observeHttp("GET", "/api/documents/:id", 200, (Date.now() - started) / 1000);
  return NextResponse.json({ document });
}

export async function PATCH(request: Request, { params }: Params) {
  const started = Date.now();
  const { id } = await params;
  const session = await requireSession();
  if (session instanceof NextResponse) {
    observeHttp("PATCH", "/api/documents/:id", 401, (Date.now() - started) / 1000);
    return session;
  }

  const forbidden = forbidUnlessWriter(session);
  if (forbidden) {
    observeHttp("PATCH", "/api/documents/:id", 403, (Date.now() - started) / 1000);
    return forbidden;
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    observeHttp("PATCH", "/api/documents/:id", 400, (Date.now() - started) / 1000);
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = tenantDb(session);
  const existing = await db.document.findFirst({ where: { id } });
  if (!existing) {
    observeHttp("PATCH", "/api/documents/:id", 404, (Date.now() - started) / 1000);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const document = await db.document.update({
    where: { id, tenantId: session.tenantId },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.content !== undefined
        ? { content: parsed.data.content as object }
        : {}),
    },
  });

  observeHttp("PATCH", "/api/documents/:id", 200, (Date.now() - started) / 1000);
  return NextResponse.json({ document });
}

export async function DELETE(_request: Request, { params }: Params) {
  const started = Date.now();
  const { id } = await params;
  const session = await requireSession();
  if (session instanceof NextResponse) {
    observeHttp("DELETE", "/api/documents/:id", 401, (Date.now() - started) / 1000);
    return session;
  }

  const forbidden = forbidUnlessWriter(session);
  if (forbidden) {
    observeHttp("DELETE", "/api/documents/:id", 403, (Date.now() - started) / 1000);
    return forbidden;
  }

  const db = tenantDb(session);
  const existing = await db.document.findFirst({ where: { id } });
  if (!existing) {
    observeHttp("DELETE", "/api/documents/:id", 404, (Date.now() - started) / 1000);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.document.delete({ where: { id, tenantId: session.tenantId } });
  observeHttp("DELETE", "/api/documents/:id", 200, (Date.now() - started) / 1000);
  return NextResponse.json({ ok: true });
}
