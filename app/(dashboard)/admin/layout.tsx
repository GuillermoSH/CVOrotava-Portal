import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { requirePortalRole } from "@/lib/auth/portal-access";
import { appRoutes } from "@/lib/constants";

/**
 * Auth layout: cookies en gate paralelo. `instant = false` opta el segmento
 * del layout fuera de la validación (documentado Next 16); las pages streaman
 * con `loading.tsx` / `RuntimePage`.
 */
export const instant = false;

async function EnsureAdminAccess() {
  const role = await requirePortalRole();
  if (role === "parent") {
    redirect(appRoutes.parents);
  }
  return null;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell navTitle="Área dirección" homeHref={appRoutes.admin}>
      <Suspense fallback={null}>
        <EnsureAdminAccess />
      </Suspense>
      {children}
    </AppShell>
  );
}
