import { describe, expect, it } from "vitest";
import { canManageDocumentGrants } from "@/server/document-access";
import type { AppSession } from "@/server/session";
import type { Role } from "@prisma/client";

function session(overrides: Partial<AppSession> & { role: Role }): AppSession {
  return {
    userId: "user-1",
    email: "u@test",
    name: "U",
    tenantId: "tenant-1",
    tenantSlug: "acme",
    tenantName: "Acme",
    ...overrides,
  };
}

describe("document-access", () => {
  it("allows document creator to manage grants", () => {
    expect(
      canManageDocumentGrants(session({ userId: "creator", role: "viewer" }), {
        createdById: "creator",
      }),
    ).toBe(true);
  });

  it("allows tenant admin/owner to manage grants", () => {
    expect(
      canManageDocumentGrants(session({ role: "admin" }), {
        createdById: "other",
      }),
    ).toBe(true);
    expect(
      canManageDocumentGrants(session({ role: "owner" }), {
        createdById: "other",
      }),
    ).toBe(true);
  });

  it("denies editors who did not create the document", () => {
    expect(
      canManageDocumentGrants(session({ role: "editor" }), {
        createdById: "other",
      }),
    ).toBe(false);
  });
});
