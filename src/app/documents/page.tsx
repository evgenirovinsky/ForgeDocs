import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import Link from "next/link";
import { createTenantPrisma } from "@/server/db";
import { canWriteDocuments } from "@/server/rbac";
import { CreateDocumentButton } from "@/components/CreateDocumentButton";

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const db = createTenantPrisma({ tenantId: session.user.tenantId });
  const documents = await db.document.findMany({
    orderBy: { updatedAt: "desc" },
  });
  const canWrite = canWriteDocuments(session.user.role);

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <Link href="/documents" className="text-lg font-semibold">
              ForgeDocs
            </Link>
            <p className="text-sm text-stone-600">
              {session.user.tenantName} · {session.user.role} ·{" "}
              {session.user.email}
            </p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded border px-3 py-1.5 text-sm hover:bg-stone-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Documents</h1>
          {canWrite && <CreateDocumentButton />}
        </div>

        <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
          {documents.length === 0 && (
            <li className="p-4 text-stone-500">No documents yet.</li>
          )}
          {documents.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/documents/${doc.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-stone-50"
                data-testid="document-row"
              >
                <span className="font-medium">{doc.title}</span>
                <span className="text-sm text-stone-500">
                  {new Date(doc.updatedAt).toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
