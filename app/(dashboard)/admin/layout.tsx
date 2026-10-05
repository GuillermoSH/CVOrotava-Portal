import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { requirePortalRole } from "@/lib/auth/portal-access";
import { appRoutes } from "@/lib/constants";

export const instant = false;

function AdminLayoutFallback({ children }: { children: React.ReactNode }) {
  return (
    <AppShell navTitle="Área dirección" homeHref={appRoutes.admin}>
      {children}
    </AppShell>
  );
}

async function AdminLayoutGate({ children }: { children: React.ReactNode }) {
  const role = await requirePortalRole();

  if (role === "parent") {
    redirect(appRoutes.parents);
  }

  return <AdminLayoutFallback>{children}</AdminLayoutFallback>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <AdminLayoutFallback>
          <p className="p-6 text-sm text-muted-foreground">Cargando…</p>
        </AdminLayoutFallback>
      }
    >
      <AdminLayoutGate>{children}</AdminLayoutGate>
    </Suspense>
  );
}
