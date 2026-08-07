import { PrismaClient, type Prisma, type Role } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

type TenantContext = {
  tenantId: string;
};

function assertTenantFilter(
  where: Record<string, unknown> | undefined,
  tenantId: string,
  operation: string,
) {
  if (!where || where.tenantId !== tenantId) {
    throw new Error(
      `Tenant isolation violation on Document.${operation}: tenantId filter required`,
    );
  }
}

/** Prisma client scoped to a tenant. Document queries fail closed without tenantId. */
export function createTenantPrisma({ tenantId }: TenantContext) {
  return prisma.$extends({
    query: {
      document: {
        async findMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findUnique({ args, query }) {
          const result = await query(args);
          if (result && result.tenantId !== tenantId) {
            return null;
          }
          return result;
        },
        async create({ args, query }) {
          const data = args.data as Prisma.DocumentUncheckedCreateInput;
          args.data = { ...data, tenantId } as typeof args.data;
          return query(args);
        },
        async createMany({ args, query }) {
          if (Array.isArray(args.data)) {
            args.data = args.data.map((row) => ({ ...row, tenantId }));
          } else {
            args.data = { ...args.data, tenantId };
          }
          return query(args);
        },
        async update({ args, query }) {
          assertTenantFilter(args.where as Record<string, unknown>, tenantId, "update");
          return query(args);
        },
        async updateMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async delete({ args, query }) {
          assertTenantFilter(args.where as Record<string, unknown>, tenantId, "delete");
          return query(args);
        },
        async deleteMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
      },
    },
  });
}

export type TenantPrisma = ReturnType<typeof createTenantPrisma>;

export type SessionMembership = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  role: Role;
};
