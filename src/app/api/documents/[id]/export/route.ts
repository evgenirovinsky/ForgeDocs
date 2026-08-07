import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { processExportJob } from "@/server/export/process-job";
import { observeHttp } from "@/server/metrics";
import { requireSession, tenantDb } from "@/server/session";
import { cacheSet, exportJobCacheKey } from "@/server/cache";

const schema = z.object({
  format: z.enum(["docx", "pdf"]),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const started = Date.now();
  const { id } = await params;
  const session = await requireSession();
  if (session instanceof NextResponse) {
    observeHttp("POST", "/api/documents/:id/export", 401, (Date.now() - started) / 1000);
    return session;
  }

  // viewers can export (read-adjacent); require viewer which everyone has
  // editors+ can also export; all roles can
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    observeHttp("POST", "/api/documents/:id/export", 400, (Date.now() - started) / 1000);
    return NextResponse.json({ error: "format must be docx or pdf" }, { status: 400 });
  }

  const db = tenantDb(session);
  const document = await db.document.findFirst({ where: { id } });
  if (!document) {
    observeHttp("POST", "/api/documents/:id/export", 404, (Date.now() - started) / 1000);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const job = await prisma.exportJob.create({
    data: {
      documentId: document.id,
      format: parsed.data.format,
      status: "pending",
    },
  });

  await cacheSet(
    exportJobCacheKey(job.id),
    JSON.stringify({ status: "pending" }),
    300,
  );

  // Process inline for simplicity (demo-friendly); status still tracked as a job
  await processExportJob(job.id);

  const updated = await prisma.exportJob.findUnique({ where: { id: job.id } });
  observeHttp("POST", "/api/documents/:id/export", 200, (Date.now() - started) / 1000);
  return NextResponse.json({ job: updated });
}
