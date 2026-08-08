"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

const defaultDevEmail =
  process.env.NEXT_PUBLIC_DEFAULT_DEV_EMAIL || "alice@acme.test";

const DEMO_USERS = [
  { email: defaultDevEmail, label: "Dev editor — Acme (Azure / credentials)" },
  { email: "bob@acme.test", label: "Bob — Acme viewer" },
  { email: "dave@acme.test", label: "Dave — Acme owner" },
  { email: "carol@globex.test", label: "Carol — Globex admin" },
];

type LoginFormProps = {
  azureEnabled: boolean;
  credentialsEnabled: boolean;
};

export function LoginForm({
  azureEnabled,
  credentialsEnabled,
}: LoginFormProps) {
  const router = useRouter();
  const params = useSearchParams();
  const invited = params.get("invited") === "1";
  const invitedEmail = params.get("email");
  const [email, setEmail] = useState(invitedEmail || defaultDevEmail);
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!credentialsEnabled) return;
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

      {invited && (
        <p
          className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          data-testid="invite-accepted"
        >
          Invite accepted
          {invitedEmail ? ` for ${invitedEmail}` : ""}. Sign in with Microsoft
          (same email) or credentials if enabled (password{" "}
          <code>password123</code>).
        </p>
      )}

      {credentialsEnabled ? (
        <>
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
        </>
      ) : (
        <p className="text-sm text-stone-600">
          Production sign-in is Microsoft Entra ID only.
        </p>
      )}

      {azureEnabled ? (
        <button
          type="button"
          className="w-full rounded bg-stone-900 py-2 text-sm text-white hover:bg-stone-700"
          onClick={() =>
            signIn("microsoft-entra-id", { callbackUrl: "/documents" })
          }
        >
          Sign in with Microsoft
        </button>
      ) : (
        !credentialsEnabled && (
          <p className="text-sm text-red-600">
            Azure AD is not configured. Set AUTH_MICROSOFT_ENTRA_ID_* env vars.
          </p>
        )
      )}
    </div>
  );
}
