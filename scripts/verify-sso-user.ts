import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const email = process.env.DEFAULT_DEV_EMAIL?.trim();

async function main() {
  if (!email) {
    console.error("Set DEFAULT_DEV_EMAIL in the environment (or .env) first.");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: { include: { tenant: true } },
      documents: { select: { id: true, title: true } },
    },
  });

  console.log(
    JSON.stringify(
      {
        email: user?.email,
        name: user?.name,
        azureOid: user?.azureOid ?? null,
        memberships: user?.memberships.map((m) => ({
          tenant: m.tenant.slug,
          role: m.role,
        })),
        docsCreated: user?.documents.length ?? 0,
      },
      null,
      2,
    ),
  );

  if (!user) {
    console.error(`No user found for DEFAULT_DEV_EMAIL=${email}`);
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
