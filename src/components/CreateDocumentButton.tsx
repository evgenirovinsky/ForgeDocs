"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateDocumentButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled document" }),
    });
    setLoading(false);
    if (!res.ok) return;
    const data = await res.json();
    router.push(`/documents/${data.document.id}`);
    router.refresh();
  }

  return (
    <button
      type="button"
      data-testid="create-document"
      disabled={loading}
      onClick={() => void create()}
      className="rounded bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-700 disabled:opacity-60"
    >
      {loading ? "Creating…" : "New document"}
    </button>
  );
}
