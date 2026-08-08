import type { NextConfig } from "next";

const defaultDevEmail =
  process.env.DEFAULT_DEV_EMAIL?.trim() || "alice@acme.test";

const credentialsEnabled =
  process.env.ALLOW_CREDENTIALS_LOGIN === "true" ||
  (process.env.ALLOW_CREDENTIALS_LOGIN !== "false" &&
    process.env.NODE_ENV !== "production");

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer", "@prisma/client", "bcryptjs"],
  env: {
    NEXT_PUBLIC_AZURE_AD_ENABLED: String(
      Boolean(
        process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
          process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      ),
    ),
    NEXT_PUBLIC_DEFAULT_DEV_EMAIL: defaultDevEmail,
    NEXT_PUBLIC_ALLOW_CREDENTIALS_LOGIN: String(credentialsEnabled),
  },
};

export default nextConfig;
