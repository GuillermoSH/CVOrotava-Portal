import "server-only";

import { redirect } from "next/navigation";

import { requirePortalRole } from "@/lib/auth/portal-access";
import { appRoutes, type UserRole } from "@/lib/constants";

export async function requireRosterWriteAccess(): Promise<UserRole> {
  const role = await requirePortalRole();
  if (role !== "admin" && role !== "manager") {
    redirect(appRoutes.admin);
  }
  return role;
}

export async function requireRosterReadAccess(): Promise<UserRole> {
  const role = await requirePortalRole();
  if (role === "parent") {
    redirect(appRoutes.parents);
  }
  return role;
}
