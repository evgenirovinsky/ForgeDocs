import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { cacheGet, exportJobCacheKey } from "@/server/cache";
import { getSignedDownloadUrl } from "@/server/storage";
import { requireSession, tenantDb } from "@/server/session";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const cached = await cacheGet(exportJobCacheKey(id));
  const job = await prisma.exportJob.findUnique({
    where: { id },
    include: { document: { select: { tenantId: true, id: true } } },
  });

  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Ensure job belongs to caller's tenant
  const db = tenantDb(session);
  const doc = await db.document.findFirst({ where: { id: job.documentId } });
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let downloadUrl: string | null = null;
  if (job.status === "completed" && job.s3Key) {
    downloadUrl = await getSignedDownloadUrl(job.s3Key);
  }

  return NextResponse.json({
    job: {
      id: job.id,
      format: job.format,
      status: job.status,
      error: job.error,
      downloadUrl,
    },
    cached: cached ? JSON.parse(cached) : null,
  });
}
