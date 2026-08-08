import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { createTenantPrisma } from "@/server/db";
import {
  canManageDocumentGrants,
  canWriteDocument,
} from "@/server/document-access";
import { DocumentEditor } from "@/components/editor/DocumentEditor";
import { ShareDocumentPanel } from "@/components/editor/ShareDocumentPanel";
import type { AppSession } from "@/server/session";

type Props = { params: Promise<{ id: string }> };

export default async function DocumentPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const appSession: AppSession = {
    userId: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    tenantId: session.user.tenantId,
    tenantSlug: session.user.tenantSlug,
    tenantName: session.user.tenantName,
    role: session.user.role,
  };

  const db = createTenantPrisma({ tenantId: session.user.tenantId });
  const document = await db.document.findFirst({ where: { id } });
  if (!document) notFound();

  const canWrite = await canWriteDocument(appSession, document.id);
  const canShare = canManageDocumentGrants(appSession, document);
  const readOnly = !canWrite;

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/documents" className="text-sm text-stone-600 hover:underline">
            ← Documents
          </Link>
          <div className="flex items-center gap-3">
            {canShare && <ShareDocumentPanel documentId={document.id} />}
            <p className="text-sm text-stone-600">
              {session.user.tenantName} · {session.user.role}
              {readOnly ? " (read-only)" : ""}
            </p>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <DocumentEditor
          documentId={document.id}
          initialTitle={document.title}
          initialContent={document.content as object}
          readOnly={readOnly}
        />
      </div>
    </main>
  );
}
