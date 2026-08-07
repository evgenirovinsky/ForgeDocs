import type { ExportFormat } from "@prisma/client";
import { prisma } from "@/server/db";
import { cacheSet, exportJobCacheKey } from "@/server/cache";
import { exportJobsTotal } from "@/server/metrics";
import { tenantObjectKey, uploadObject } from "@/server/storage";
import {
  tipTapJsonToDocxBuffer,
  tipTapToHtml,
  type TipTapNode,
} from "@/server/export/tiptap-transform";

async function renderPdf(html: string): Promise<Buffer> {
  const puppeteer = await import("puppeteer");
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  const browser = await puppeteer.default.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function processExportJob(jobId: string): Promise<void> {
  const job = await prisma.exportJob.findUnique({
    where: { id: jobId },
    include: { document: true },
  });
  if (!job) return;

  await prisma.exportJob.update({
    where: { id: jobId },
    data: { status: "processing" },
  });
  await cacheSet(
    exportJobCacheKey(jobId),
    JSON.stringify({ status: "processing" }),
    300,
  );

  try {
    const content = job.document.content as TipTapNode;
    const format = job.format as ExportFormat;
    let body: Buffer;
    let contentType: string;
    let extension: string;

    if (format === "docx") {
      body = await tipTapJsonToDocxBuffer(job.document.title, content);
      contentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      extension = "docx";
    } else {
      const html = tipTapToHtml(job.document.title, content);
      body = await renderPdf(html);
      contentType = "application/pdf";
      extension = "pdf";
    }

    const key = tenantObjectKey(
      job.document.tenantId,
      "exports",
      `${job.document.id}-${jobId}.${extension}`,
    );
    await uploadObject(key, body, contentType);

    await prisma.exportJob.update({
      where: { id: jobId },
      data: { status: "completed", s3Key: key, error: null },
    });
    await cacheSet(
      exportJobCacheKey(jobId),
      JSON.stringify({ status: "completed", s3Key: key }),
      300,
    );
    exportJobsTotal.inc({ format, status: "completed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    await prisma.exportJob.update({
      where: { id: jobId },
      data: { status: "failed", error: message },
    });
    await cacheSet(
      exportJobCacheKey(jobId),
      JSON.stringify({ status: "failed", error: message }),
      300,
    );
    exportJobsTotal.inc({ format: job.format, status: "failed" });
  }
}
