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
  return Boolean(
    process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
      process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
  );
}
