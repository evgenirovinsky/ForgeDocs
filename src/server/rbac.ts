import type { Role } from "@prisma/client";

const ROLE_RANK: Record<Role, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

export function hasMinRole(role: Role, required: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

export function canReadDocuments(role: Role): boolean {
  return hasMinRole(role, "viewer");
}

export function canWriteDocuments(role: Role): boolean {
  return hasMinRole(role, "editor");
}

export function canManageTenant(role: Role): boolean {
  return hasMinRole(role, "admin");
}

export function assertCanWrite(role: Role): void {
  if (!canWriteDocuments(role)) {
    throw new Error("Forbidden: editor role required");
  }
}

export function assertCanRead(role: Role): void {
  if (!canReadDocuments(role)) {
    throw new Error("Forbidden: viewer role required");
  }
}
