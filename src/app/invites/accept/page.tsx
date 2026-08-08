import { redirect } from "next/navigation";
import Link from "next/link";
import { acceptInviteToken } from "@/server/invites";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function AcceptInvitePage({ searchParams }: Props) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="max-w-md rounded-xl border bg-white p-8 space-y-3">
          <h1 className="text-xl font-semibold">Invalid invite</h1>
          <p className="text-sm text-stone-600">Missing invite token.</p>
          <Link href="/login" className="text-sm underline">
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  const result = await acceptInviteToken(token);
  if (result.ok) {
    redirect(
      `/login?invited=1&email=${encodeURIComponent(result.email)}`,
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="max-w-md rounded-xl border bg-white p-8 space-y-3">
        <h1 className="text-xl font-semibold">Invite unavailable</h1>
        <p className="text-sm text-stone-600" data-testid="invite-error">
          {result.error}
        </p>
        <Link href="/login" className="text-sm underline">
          Go to login
        </Link>
      </div>
    </main>
  );
}
