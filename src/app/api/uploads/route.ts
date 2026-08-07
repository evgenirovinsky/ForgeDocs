import { NextResponse } from "next/server";
import {
  forbidUnlessWriter,
  requireSession,
} from "@/server/session";
import { tenantObjectKey, uploadObject, getSignedDownloadUrl } from "@/server/storage";

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const forbidden = forbidUnlessWriter(session);
  if (forbidden) return forbidden;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = tenantObjectKey(
    session.tenantId,
    "images",
    `${Date.now()}-${safeName}`,
  );

  await uploadObject(key, bytes, file.type || "application/octet-stream");
  const url = await getSignedDownloadUrl(key, 60 * 60 * 24);

  return NextResponse.json({ key, url });
}
