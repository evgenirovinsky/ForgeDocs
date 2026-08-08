import { NextResponse } from "next/server";
import type { Document, DocumentPermission } from "@prisma/client";
import { prisma } from "@/server/db";
import { canManageTenant, canWriteDocuments } from "@/server/rbac";
import type { AppSession } from "@/server/session";

export function canManageDocumentGrants(
  session: AppSession,
  document: Pick<Document, "createdById">,
): boolean {
  if (document.createdById === session.userId) return true;
  return canManageTenant(session.role);
}

export async function hasEditorGrant(
  userId: string,
  documentId: string,
): Promise<boolean> {
  const grant = await prisma.documentGrant.findUnique({
    where: {
      documentId_userId: { documentId, userId },
    },
  });
  return grant?.permission === "editor";
}

export async function canWriteDocument(
  session: AppSession,
  documentId: string,
): Promise<boolean> {
  if (canWriteDocuments(session.role)) return true;
  return hasEditorGrant(session.userId, documentId);
}

export async function forbidUnlessDocWriter(
  session: AppSession,
  documentId: string,
): Promise<NextResponse | null> {
  if (await canWriteDocument(session, documentId)) return null;
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function isValidGrantPermission(
  value: unknown,
): value is DocumentPermission {
  return value === "viewer" || value === "editor";
}
