import { NextResponse } from "next/server";
import {
  forbidUnlessTenantAdmin,
  requireSession,
} from "@/server/session";
import { revokeInvite } from "@/server/invites";
import { observeHttp } from "@/server/metrics";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const started = Date.now();
  const { id } = await params;
  const session = await requireSession();
  if (session instanceof NextResponse) {
    observeHttp("DELETE", "/api/invites/:id", 401, (Date.now() - started) / 1000);
    return session;
  }
  const forbidden = forbidUnlessTenantAdmin(session);
  if (forbidden) {
    observeHttp("DELETE", "/api/invites/:id", 403, (Date.now() - started) / 1000);
    return forbidden;
  }

  const result = await revokeInvite(session.tenantId, id);
  if (!result.ok) {
    observeHttp("DELETE", "/api/invites/:id", result.status, (Date.now() - started) / 1000);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  observeHttp("DELETE", "/api/invites/:id", 200, (Date.now() - started) / 1000);
  return NextResponse.json({ ok: true });
}
