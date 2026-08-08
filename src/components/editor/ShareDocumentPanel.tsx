"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type GrantRow = {
  id: string;
  permission: string;
  userId: string;
  email: string;
  name: string;
};

type Props = {
  documentId: string;
};

export function ShareDocumentPanel({ documentId }: Props) {
  const [open, setOpen] = useState(false);
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [email, setEmail] = useState("bob@acme.test");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadGrants = useCallback(async () => {
    const res = await fetch(`/api/documents/${documentId}/grants`);
    if (!res.ok) {
      setError("Failed to load grants");
      return;
    }
    const data = (await res.json()) as { grants: GrantRow[] };
    setGrants(data.grants);
    setError(null);
  }, [documentId]);

  useEffect(() => {
    if (open) void loadGrants();
  }, [open, loadGrants]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/documents/${documentId}/grants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, permission: "editor" }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(
        typeof data?.error === "string" ? data.error : "Could not add grant",
      );
      return;
    }
    setEmail("");
    await loadGrants();
  }

  async function onRemove(userId: string) {
    setLoading(true);
    setError(null);
    const res = await fetch(
      `/api/documents/${documentId}/grants?userId=${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    );
    setLoading(false);
    if (!res.ok) {
      setError("Could not remove grant");
      return;
    }
    await loadGrants();
  }

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="share-document"
        className="rounded border border-stone-300 bg-white px-2 py-1 text-sm hover:bg-stone-100"
        onClick={() => setOpen((v) => !v)}
      >
        Share
      </button>
      {open && (
        <div
          data-testid="share-panel"
          className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-stone-200 bg-white p-4 shadow-lg"
        >
          <p className="text-sm font-medium text-stone-900">
            Elevate a tenant viewer to editor
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Grants apply to this document only. Members still see all tenant
            docs.
          </p>

          <ul className="mt-3 space-y-2">
            {grants.length === 0 && (
              <li className="text-xs text-stone-500">No elevated grants yet.</li>
            )}
            {grants.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between gap-2 text-sm"
                data-testid="grant-row"
              >
                <span className="truncate">
                  {g.email}{" "}
                  <span className="text-stone-500">({g.permission})</span>
                </span>
                <button
                  type="button"
                  className="shrink-0 text-xs text-red-700 hover:underline"
                  disabled={loading}
                  onClick={() => void onRemove(g.userId)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={onAdd} className="mt-3 space-y-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@tenant.test"
              data-testid="share-email"
              className="w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              data-testid="share-submit"
              className="w-full rounded bg-stone-900 py-1.5 text-sm text-white hover:bg-stone-700 disabled:opacity-60"
            >
              Grant editor
            </button>
          </form>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
