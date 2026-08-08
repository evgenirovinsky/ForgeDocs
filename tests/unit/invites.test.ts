import { describe, expect, it } from "vitest";
import {
  hashInviteToken,
  isInviteableRole,
  inviteUrlForToken,
} from "@/server/invites";
import { canManageTenant } from "@/server/rbac";

describe("invites helpers", () => {
  it("hashes tokens stably", () => {
    expect(hashInviteToken("abc")).toBe(hashInviteToken("abc"));
    expect(hashInviteToken("abc")).not.toBe(hashInviteToken("abd"));
  });

  it("allows viewer/editor/admin but not owner", () => {
    expect(isInviteableRole("viewer")).toBe(true);
    expect(isInviteableRole("editor")).toBe(true);
    expect(isInviteableRole("admin")).toBe(true);
    expect(isInviteableRole("owner")).toBe(false);
  });

  it("builds accept URLs", () => {
    expect(inviteUrlForToken("tok")).toContain("/invites/accept?token=tok");
  });

  it("gates invite management to admin/owner", () => {
    expect(canManageTenant("admin")).toBe(true);
    expect(canManageTenant("owner")).toBe(true);
    expect(canManageTenant("editor")).toBe(false);
    expect(canManageTenant("viewer")).toBe(false);
  });
});
