import "server-only";

import { redirect } from "next/navigation";

import { requirePortalRole } from "@/lib/auth/portal-access";
import { appRoutes } from "@/lib/constants";

/** Admin and manager can write clothing data; coach is read-only. */
export async function requireClothingWriteAccess(): Promise<void> {
  const role = await requirePortalRole();
  if (role !== "admin" && role !== "manager") {
    redirect(appRoutes.admin);
  }
}

export async function requireClothingReadAccess(): Promise<void> {
  const role = await requirePortalRole();
  if (role === "parent") {
    redirect(appRoutes.parents);
  }
}
