import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { createTenantPrisma } from "@/server/db";
import { canWriteDocuments } from "@/server/rbac";
import { DocumentEditor } from "@/components/editor/DocumentEditor";

type Props = { params: Promise<{ id: string }> };

export default async function DocumentPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const db = createTenantPrisma({ tenantId: session.user.tenantId });
  const document = await db.document.findFirst({ where: { id } });
  if (!document) notFound();

  const readOnly = !canWriteDocuments(session.user.role);

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/documents" className="text-sm text-stone-600 hover:underline">
            ← Documents
          </Link>
          <p className="text-sm text-stone-600">
            {session.user.tenantName} · {session.user.role}
            {readOnly ? " (read-only)" : ""}
          </p>
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
