import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import {
  forbidUnlessTenantAdmin,
  requireSession,
} from "@/server/session";
import {
  createTenantInvite,
  isInviteableRole,
} from "@/server/invites";
import { observeHttp } from "@/server/metrics";

const createSchema = z.object({
  email: z.string().email(),
  role: z.enum(["viewer", "editor", "admin"]).default("viewer"),
});

export async function GET() {
  const started = Date.now();
  const session = await requireSession();
  if (session instanceof NextResponse) {
    observeHttp("GET", "/api/invites", 401, (Date.now() - started) / 1000);
    return session;
  }
  const forbidden = forbidUnlessTenantAdmin(session);
  if (forbidden) {
    observeHttp("GET", "/api/invites", 403, (Date.now() - started) / 1000);
    return forbidden;
  }

  const invites = await prisma.tenantInvite.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      invitedBy: { select: { email: true, name: true } },
    },
  });

  observeHttp("GET", "/api/invites", 200, (Date.now() - started) / 1000);
  return NextResponse.json({
    invites: invites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      status: i.status,
      expiresAt: i.expiresAt,
      acceptedAt: i.acceptedAt,
      createdAt: i.createdAt,
      invitedByEmail: i.invitedBy.email,
    })),
  });
}

export async function POST(request: Request) {
  const started = Date.now();
  const session = await requireSession();
  if (session instanceof NextResponse) {
    observeHttp("POST", "/api/invites", 401, (Date.now() - started) / 1000);
    return session;
  }
  const forbidden = forbidUnlessTenantAdmin(session);
  if (forbidden) {
    observeHttp("POST", "/api/invites", 403, (Date.now() - started) / 1000);
    return forbidden;
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success || !isInviteableRole(parsed.data.role)) {
    observeHttp("POST", "/api/invites", 400, (Date.now() - started) / 1000);
    return NextResponse.json(
      { error: parsed.success ? "Invalid role" : parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await createTenantInvite({
    tenantId: session.tenantId,
    tenantName: session.tenantName,
    email: parsed.data.email,
    role: parsed.data.role,
    invitedById: session.userId,
  });

  if (!result.ok) {
    observeHttp("POST", "/api/invites", result.status, (Date.now() - started) / 1000);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  observeHttp("POST", "/api/invites", 200, (Date.now() - started) / 1000);
  return NextResponse.json({
    invite: {
      id: result.invite.id,
      email: result.invite.email,
      role: result.invite.role,
      status: result.invite.status,
      expiresAt: result.invite.expiresAt,
      createdAt: result.invite.createdAt,
    },
    inviteUrl: result.inviteUrl,
  });
}
