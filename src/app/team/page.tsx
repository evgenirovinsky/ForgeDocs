import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { canManageTenant } from "@/server/rbac";
import { TeamInvitePanel } from "@/components/team/TeamInvitePanel";

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canManageTenant(session.user.role)) redirect("/documents");

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <Link href="/documents" className="text-lg font-semibold">
              ForgeDocs
            </Link>
            <p className="text-sm text-stone-600">
              Team · {session.user.tenantName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/documents"
              className="text-sm text-stone-600 hover:underline"
            >
              Documents
            </Link>
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
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-4">
        <h1 className="text-2xl font-semibold">Team invites</h1>
        <TeamInvitePanel />
      </div>
    </main>
  );
}
