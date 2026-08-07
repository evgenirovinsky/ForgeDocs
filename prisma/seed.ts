import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const password = "password123";

async function main() {
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.exportJob.deleteMany();
  await prisma.document.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const acme = await prisma.tenant.create({
    data: { slug: "acme", name: "Acme Corp" },
  });
  const globex = await prisma.tenant.create({
    data: { slug: "globex", name: "Globex Inc" },
  });

  const alice = await prisma.user.create({
    data: {
      email: "alice@acme.test",
      name: "Alice Editor",
      passwordHash,
    },
  });
  const bob = await prisma.user.create({
    data: {
      email: "bob@acme.test",
      name: "Bob Viewer",
      passwordHash,
    },
  });
  const carol = await prisma.user.create({
    data: {
      email: "carol@globex.test",
      name: "Carol Admin",
      passwordHash,
    },
  });
  const dave = await prisma.user.create({
    data: {
      email: "dave@acme.test",
      name: "Dave Owner",
      passwordHash,
    },
  });

  await prisma.membership.createMany({
    data: [
      { userId: dave.id, tenantId: acme.id, role: "owner" },
      { userId: alice.id, tenantId: acme.id, role: "editor" },
      { userId: bob.id, tenantId: acme.id, role: "viewer" },
      { userId: carol.id, tenantId: globex.id, role: "admin" },
    ],
  });

  const emptyDoc = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Welcome to ForgeDocs." }],
      },
    ],
  };

  await prisma.document.create({
    data: {
      tenantId: acme.id,
      title: "Acme Handbook",
      content: emptyDoc,
      createdById: alice.id,
    },
  });

  await prisma.document.create({
    data: {
      tenantId: globex.id,
      title: "Globex Playbook",
      content: emptyDoc,
      createdById: carol.id,
    },
  });

  console.log("Seeded tenants: Acme, Globex");
  console.log("Dev password for all users:", password);
  console.log("Users:");
  console.log("  alice@acme.test  (editor)");
  console.log("  bob@acme.test    (viewer)");
  console.log("  dave@acme.test   (owner)");
  console.log("  carol@globex.test (admin)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
