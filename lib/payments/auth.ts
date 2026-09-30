import "server-only";

import { redirect } from "next/navigation";

import { requirePortalRole } from "@/lib/auth/portal-access";
import { appRoutes } from "@/lib/constants";

/** Admin y manager registran pagos; el resto no accede a la página. */
export async function requirePaymentsWriteAccess(): Promise<void> {
  const role = await requirePortalRole();
  if (role !== "admin" && role !== "manager") {
    redirect(appRoutes.admin);
  }
}
