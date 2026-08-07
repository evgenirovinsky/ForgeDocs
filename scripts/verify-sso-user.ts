import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "evgeni.rovinsky@gmail.com" },
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
        azureOid: user?.azureOid,
        memberships: user?.memberships.map((m) => ({
          tenant: m.tenant.slug,
          role: m.role,
        })),
        docsCreated: user?.documents.length,
      },
      null,
      2,
    ),
  );

  const acmeDocs = await prisma.document.findMany({
    where: { tenant: { slug: "acme" } },
    select: { title: true },
  });
  console.log("acmeDocs:", acmeDocs.map((d) => d.title));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
