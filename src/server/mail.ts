/**
 * Demo mail transport: logs only. Swap for Resend/SMTP later.
 */
export async function sendInviteEmail(input: {
  to: string;
  tenantName: string;
  inviteUrl: string;
  role: string;
}): Promise<void> {
  console.info(
    `[mail:invite] to=${input.to} tenant=${input.tenantName} role=${input.role} url=${input.inviteUrl}`,
  );
}

export function appBaseUrl(): string {
  return (
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
