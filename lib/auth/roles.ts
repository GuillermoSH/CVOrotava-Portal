import type { UserRole } from "@/lib/constants";

export function isUserRole(value: unknown): value is UserRole {
  return value === "parent" || value === "admin";
}
