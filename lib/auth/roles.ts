import { userRoles, type UserRole } from "@/lib/constants";

export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    (userRoles as readonly string[]).includes(value)
  );
}
