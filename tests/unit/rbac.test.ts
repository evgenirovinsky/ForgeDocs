import { describe, expect, it } from "vitest";
import {
  canManageTenant,
  canReadDocuments,
  canWriteDocuments,
  hasMinRole,
} from "@/server/rbac";

describe("rbac", () => {
  it("orders roles by privilege", () => {
    expect(hasMinRole("editor", "viewer")).toBe(true);
    expect(hasMinRole("viewer", "editor")).toBe(false);
    expect(hasMinRole("owner", "admin")).toBe(true);
  });

  it("maps document permissions", () => {
    expect(canReadDocuments("viewer")).toBe(true);
    expect(canWriteDocuments("viewer")).toBe(false);
    expect(canWriteDocuments("editor")).toBe(true);
    expect(canManageTenant("admin")).toBe(true);
    expect(canManageTenant("editor")).toBe(false);
  });
});
