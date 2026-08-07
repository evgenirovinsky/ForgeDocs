import type { NextConfig } from "next";

const defaultDevEmail =
  process.env.DEFAULT_DEV_EMAIL?.trim() || "alice@acme.test";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer", "@prisma/client", "bcryptjs"],
  env: {
    NEXT_PUBLIC_AZURE_AD_ENABLED: String(
      Boolean(
        process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
          process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      ),
    ),
    // Expose DEFAULT_DEV_EMAIL to the client login UI (single source of truth).
    NEXT_PUBLIC_DEFAULT_DEV_EMAIL: defaultDevEmail,
  },
};

export default nextConfig;
