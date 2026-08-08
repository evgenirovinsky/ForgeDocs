"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type InviteRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedByEmail: string;
};

export function TeamInvitePanel() {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor" | "admin">("viewer");
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/invites");
    if (!res.ok) {
      setError("Failed to load invites");
      return;
    }
    const data = (await res.json()) as { invites: InviteRow[] };
    setInvites(data.invites);
    setError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCopied(false);
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    setLoading(false);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(
        typeof data?.error === "string" ? data.error : "Could not create invite",
      );
      return;
    }
    setLastUrl(data.inviteUrl as string);
    setEmail("");
    await load();
  }

  async function onRevoke(id: string) {
    setLoading(true);
    const res = await fetch(`/api/invites/${id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      setError("Could not revoke invite");
      return;
    }
    await load();
  }

  async function copyUrl() {
    if (!lastUrl) return;
    await navigator.clipboard.writeText(lastUrl);
    setCopied(true);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onCreate}
        className="rounded-lg border border-stone-200 bg-white p-4 space-y-3"
        data-testid="invite-form"
      >
        <h2 className="font-medium">Invite someone</h2>
        <p className="text-sm text-stone-600">
          Demo delivery: the invite link is returned here (and logged server-side).
          No SMTP yet — copy the link and send it yourself.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@example.com"
            data-testid="invite-email"
            className="flex-1 rounded border border-stone-300 px-3 py-2 text-sm"
          />
          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value as "viewer" | "editor" | "admin")
            }
            data-testid="invite-role"
            className="rounded border border-stone-300 px-3 py-2 text-sm"
          >
            <option value="viewer">viewer</option>
            <option value="editor">editor</option>
            <option value="admin">admin</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            data-testid="invite-submit"
            className="rounded bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-700 disabled:opacity-60"
          >
            Create invite
          </button>
        </div>
        {lastUrl && (
          <div
            className="rounded border border-stone-200 bg-stone-50 p-3 space-y-2"
            data-testid="invite-url-box"
          >
            <p className="text-xs uppercase tracking-wide text-stone-500">
              Invite link (copy now)
            </p>
            <code className="block break-all text-xs text-stone-800">{lastUrl}</code>
            <button
              type="button"
              data-testid="invite-copy"
              onClick={() => void copyUrl()}
              className="rounded border px-2 py-1 text-xs hover:bg-white"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <div className="rounded-lg border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-4 py-3">
          <h2 className="font-medium">Recent invites</h2>
        </div>
        <ul className="divide-y divide-stone-100">
          {invites.length === 0 && (
            <li className="px-4 py-3 text-sm text-stone-500">No invites yet.</li>
          )}
          {invites.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              data-testid="invite-row"
            >
              <div>
                <p className="font-medium">{inv.email}</p>
                <p className="text-xs text-stone-500">
                  {inv.role} · {inv.status} · expires{" "}
                  {new Date(inv.expiresAt).toLocaleDateString()}
                </p>
              </div>
              {inv.status === "pending" && (
                <button
                  type="button"
                  disabled={loading}
                  className="text-xs text-red-700 hover:underline"
                  onClick={() => void onRevoke(inv.id)}
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
