"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

const DEMO_USERS = [
  { email: "evgeni.rovinsky@gmail.com", label: "Evgeni — Acme editor (Azure)" },
  { email: "bob@acme.test", label: "Bob — Acme viewer" },
  { email: "dave@acme.test", label: "Dave — Acme owner" },
  { email: "carol@globex.test", label: "Carol — Globex admin" },
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("evgeni.rovinsky@gmail.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const azureEnabled = process.env.NEXT_PUBLIC_AZURE_AD_ENABLED === "true";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid credentials or no tenant membership");
      return;
    }
    router.push(params.get("callbackUrl") || "/documents");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">ForgeDocs</h1>
        <p className="text-sm text-stone-600 mt-1">
          Multi-tenant documents with TipTap, RBAC, and export pipelines.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" data-testid="login-form">
        <label className="block text-sm">
          Email
          <input
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="login-email"
            autoComplete="username"
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            type="password"
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="login-password"
            autoComplete="current-password"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          data-testid="login-submit"
          className="w-full rounded bg-stone-900 py-2 text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-stone-500">
          Quick fill (password: password123)
        </p>
        <div className="flex flex-col gap-1">
          {DEMO_USERS.map((u) => (
            <button
              key={u.email}
              type="button"
              className="text-left text-sm text-stone-700 hover:underline"
              onClick={() => {
                setEmail(u.email);
                setPassword("password123");
              }}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      {azureEnabled && (
        <button
          type="button"
          className="w-full rounded border border-stone-300 py-2 text-sm hover:bg-stone-50"
          onClick={() => signIn("microsoft-entra-id", { callbackUrl: "/documents" })}
        >
          Sign in with Microsoft
        </button>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#f5f0e8,_#e7e5e4)] flex items-center px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
