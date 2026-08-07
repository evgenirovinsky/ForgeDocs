import { describe, expect, it } from "vitest";
import { createTenantPrisma, prisma } from "@/server/db";

const hasDb = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS === "true";

describe.skipIf(!hasDb)("tenant prisma isolation", () => {
  it("scopes document finds to tenant and fails closed on update without tenantId", async () => {
    const acme = await prisma.tenant.findUniqueOrThrow({ where: { slug: "acme" } });
    const globex = await prisma.tenant.findUniqueOrThrow({
      where: { slug: "globex" },
    });

    const acmeDb = createTenantPrisma({ tenantId: acme.id });
    const docs = await acmeDb.document.findMany();
    expect(docs.every((d) => d.tenantId === acme.id)).toBe(true);
    expect(docs.some((d) => d.tenantId === globex.id)).toBe(false);

    const foreign = await prisma.document.findFirstOrThrow({
      where: { tenantId: globex.id },
    });

    await expect(
      acmeDb.document.update({
        where: { id: foreign.id },
        data: { title: "hacked" },
      }),
    ).rejects.toThrow(/Tenant isolation violation/);
  });
});
