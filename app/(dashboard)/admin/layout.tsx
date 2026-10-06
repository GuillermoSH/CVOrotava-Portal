import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { requirePortalRole } from "@/lib/auth/portal-access";
import { appRoutes } from "@/lib/constants";

/**
 * Gate de auth en paralelo (no envuelve `{children}`).
 * Si el async de cookies rodea a children, Next marca la navegación como blocking
 * aunque haya Suspense — ver Notion Errores conocidos #11.
 */
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
