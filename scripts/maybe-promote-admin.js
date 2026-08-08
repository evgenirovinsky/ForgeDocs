if (process.env.RUN_PROMOTE_DEFAULT_ADMIN !== "true") {
  process.exit(0);
}

const { PrismaClient } = require("@prisma/client");

const email = process.env.DEFAULT_DEV_EMAIL?.trim();
if (!email) {
  console.error("RUN_PROMOTE_DEFAULT_ADMIN set but DEFAULT_DEV_EMAIL is empty");
  process.exit(1);
}

const prisma = new PrismaClient();

(async () => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user for DEFAULT_DEV_EMAIL=${email}`);
    process.exit(1);
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    include: { tenant: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) {
    console.error(`No membership for ${email}`);
    process.exit(1);
  }

  const updated = await prisma.membership.update({
    where: { id: membership.id },
    data: { role: "admin" },
  });

  console.log(
    `Promoted ${email} on ${membership.tenant.slug}: ${membership.role} → ${updated.role}`,
  );
  console.log("Set RUN_PROMOTE_DEFAULT_ADMIN=false after this boot.");
  await prisma.$disconnect();
})().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
