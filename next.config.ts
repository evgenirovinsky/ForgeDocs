import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer", "@prisma/client", "bcryptjs"],
  env: {
    NEXT_PUBLIC_AZURE_AD_ENABLED: String(
      Boolean(
        process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
          process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      ),
    ),
  },
};

export default nextConfig;
