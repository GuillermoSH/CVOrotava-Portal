import { Suspense } from "react";
import { redirect } from "next/navigation";

import { roleHomeRoute, requirePortalRole } from "@/lib/auth/portal-access";

export const instant = false;

/** Entrada del portal: sin landing; sesión → home por rol, si no → login. */
async function HomeRedirect(): Promise<null> {
  const role = await requirePortalRole();
  redirect(roleHomeRoute(role));
  return null;
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeRedirect />
    </Suspense>
  );
}
