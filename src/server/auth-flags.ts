/**
 * Credentials (email/password) are for local/CI only.
 * Production is Azure AD / Entra only unless explicitly overridden.
 */
export function credentialsLoginEnabled(): boolean {
  if (process.env.ALLOW_CREDENTIALS_LOGIN === "true") return true;
  if (process.env.ALLOW_CREDENTIALS_LOGIN === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function azureAdConfigured(): boolean {
  // Bracket access avoids Next.js build-time inlining of process.env.FOO.
  const env = process.env;
  return Boolean(
    env["AUTH_MICROSOFT_ENTRA_ID_ID"] && env["AUTH_MICROSOFT_ENTRA_ID_SECRET"],
  );
}
