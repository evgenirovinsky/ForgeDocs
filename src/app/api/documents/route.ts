import { NextResponse } from "next/server";
import { z } from "zod";
import {
  forbidUnlessWriter,
  requireSession,
  tenantDb,
} from "@/server/session";
import { observeHttp } from "@/server/metrics";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.unknown().optional(),
});

export async function GET() {
  const started = Date.now();
  const session = await requireSession();
  if (session instanceof NextResponse) {
    observeHttp("GET", "/api/documents", 401, (Date.now() - started) / 1000);
    return session;
  }

  const db = tenantDb(session);
  const documents = await db.document.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      createdAt: true,
      createdById: true,
    },
  });

  observeHttp("GET", "/api/documents", 200, (Date.now() - started) / 1000);
  return NextResponse.json({ documents, tenant: session.tenantName });
}

export async function POST(request: Request) {
  const started = Date.now();
  const session = await requireSession();
  if (session instanceof NextResponse) {
    observeHttp("POST", "/api/documents", 401, (Date.now() - started) / 1000);
    return session;
  }

  const forbidden = forbidUnlessWriter(session);
  if (forbidden) {
    observeHttp("POST", "/api/documents", 403, (Date.now() - started) / 1000);
    return forbidden;
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    observeHttp("POST", "/api/documents", 400, (Date.now() - started) / 1000);
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const emptyDoc = {
    type: "doc",
    content: [{ type: "paragraph" }],
  };

  const db = tenantDb(session);
  const document = await db.document.create({
    data: {
      title: parsed.data.title,
      content: (parsed.data.content as object) ?? emptyDoc,
      createdById: session.userId,
      tenantId: session.tenantId,
    },
  });

  observeHttp("POST", "/api/documents", 201, (Date.now() - started) / 1000);
  return NextResponse.json({ document }, { status: 201 });
}
