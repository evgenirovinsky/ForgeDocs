import { createHash, randomBytes } from "crypto";
import type { Role, TenantInvite } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/server/db";
import { appBaseUrl, sendInviteEmail } from "@/server/mail";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const INVITEABLE_ROLES: Role[] = ["viewer", "editor", "admin"];

export function isInviteableRole(role: string): role is Role {
  return (INVITEABLE_ROLES as string[]).includes(role);
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function inviteUrlForToken(token: string): string {
  return `${appBaseUrl()}/invites/accept?token=${encodeURIComponent(token)}`;
}

export type CreateInviteInput = {
  tenantId: string;
  tenantName: string;
  email: string;
  role: Role;
  invitedById: string;
};

export type CreateInviteResult =
  | { ok: true; invite: TenantInvite; inviteUrl: string; rawToken: string }
  | { ok: false; error: string; status: number };

export async function createTenantInvite(
  input: CreateInviteInput,
): Promise<CreateInviteResult> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Valid email required", status: 400 };
  }
  if (!isInviteableRole(input.role)) {
    return { ok: false, error: "Invalid role", status: 400 };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: existingUser.id,
          tenantId: input.tenantId,
        },
      },
    });
    if (membership) {
      return {
        ok: false,
        error: "User is already a member of this tenant",
        status: 400,
      };
    }
  }

  // Replace any prior pending invite for same email+tenant.
  await prisma.tenantInvite.updateMany({
    where: {
      tenantId: input.tenantId,
      email,
      status: "pending",
    },
    data: { status: "revoked" },
  });

  const rawToken = generateInviteToken();
  const invite = await prisma.tenantInvite.create({
    data: {
      tenantId: input.tenantId,
      email,
      role: input.role,
      tokenHash: hashInviteToken(rawToken),
      invitedById: input.invitedById,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      status: "pending",
    },
  });

  const inviteUrl = inviteUrlForToken(rawToken);
  await sendInviteEmail({
    to: email,
    tenantName: input.tenantName,
    inviteUrl,
    role: input.role,
  });

  return { ok: true, invite, inviteUrl, rawToken };
}

export type AcceptInviteResult =
  | { ok: true; email: string; tenantName: string }
  | { ok: false; error: string };

export async function acceptInviteToken(
  rawToken: string,
): Promise<AcceptInviteResult> {
  if (!rawToken) {
    return { ok: false, error: "Missing invite token" };
  }

  const tokenHash = hashInviteToken(rawToken);
  const invite = await prisma.tenantInvite.findFirst({
    where: { tokenHash },
    include: { tenant: true },
  });

  if (!invite) {
    return { ok: false, error: "Invite not found" };
  }
  if (invite.status === "revoked") {
    return { ok: false, error: "Invite was revoked" };
  }
  if (invite.status === "accepted") {
    return { ok: false, error: "Invite already accepted" };
  }
  if (invite.expiresAt.getTime() < Date.now() || invite.status === "expired") {
    if (invite.status === "pending") {
      await prisma.tenantInvite.update({
        where: { id: invite.id },
        data: { status: "expired" },
      });
    }
    return { ok: false, error: "Invite expired" };
  }

  const email = invite.email.toLowerCase();
  const name = email.split("@")[0] || email;
  const passwordHash = await bcrypt.hash("password123", 10);

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, name, passwordHash },
    });
  } else if (!user.passwordHash) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
  }

  const existingMembership = await prisma.membership.findUnique({
    where: {
      userId_tenantId: { userId: user.id, tenantId: invite.tenantId },
    },
  });
  if (existingMembership) {
    await prisma.tenantInvite.update({
      where: { id: invite.id },
      data: { status: "accepted", acceptedAt: new Date() },
    });
    return {
      ok: true,
      email,
      tenantName: invite.tenant.name,
    };
  }

  await prisma.$transaction([
    prisma.membership.create({
      data: {
        userId: user.id,
        tenantId: invite.tenantId,
        role: invite.role,
      },
    }),
    prisma.tenantInvite.update({
      where: { id: invite.id },
      data: { status: "accepted", acceptedAt: new Date() },
    }),
  ]);

  return {
    ok: true,
    email,
    tenantName: invite.tenant.name,
  };
}

export async function revokeInvite(
  tenantId: string,
  inviteId: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const invite = await prisma.tenantInvite.findFirst({
    where: { id: inviteId, tenantId },
  });
  if (!invite) {
    return { ok: false, error: "Not found", status: 404 };
  }
  if (invite.status !== "pending") {
    return { ok: false, error: "Only pending invites can be revoked", status: 400 };
  }
  await prisma.tenantInvite.update({
    where: { id: invite.id },
    data: { status: "revoked" },
  });
  return { ok: true };
}
