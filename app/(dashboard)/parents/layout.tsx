import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { requirePortalRole } from "@/lib/auth/portal-access";
import { appRoutes } from "@/lib/constants";

export const instant = false;

function ParentsLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      navTitle="Área familias"
      homeHref={appRoutes.parents}
      sidebarUser={{ name: "Familia López", role: "Familia" }}
    >
      {children}
    </AppShell>
  );
}

async function ParentsLayoutGate({ children }: { children: React.ReactNode }) {
  const role = await requirePortalRole();

  if (role !== "parent") {
    redirect(appRoutes.admin);
  }

  return <ParentsLayoutShell>{children}</ParentsLayoutShell>;
}

export default function ParentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <ParentsLayoutShell>
          <p className="p-6 text-sm text-muted-foreground">Cargando…</p>
        </ParentsLayoutShell>
      }
    >
      <ParentsLayoutGate>{children}</ParentsLayoutGate>
    </Suspense>
  );
}
