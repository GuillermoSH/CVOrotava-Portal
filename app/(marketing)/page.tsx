import { redirect } from "next/navigation";

import { roleHomeRoute, requirePortalRole } from "@/lib/auth/portal-access";

/** Entrada del portal: sin landing; sesión → home por rol, si no → login. */
export default async function HomePage() {
  const role = await requirePortalRole();
  redirect(roleHomeRoute(role));
}
