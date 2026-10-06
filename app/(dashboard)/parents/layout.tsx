import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { requirePortalRole } from "@/lib/auth/portal-access";
import { appRoutes } from "@/lib/constants";

async function EnsureParentAccess() {
  const role = await requirePortalRole();
  if (role !== "parent") {
    redirect(appRoutes.admin);
  }
  return null;
}

export default function ParentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      navTitle="Área familias"
      homeHref={appRoutes.parents}
      sidebarUser={{ name: "Familia López", role: "Familia" }}
    >
      <Suspense fallback={null}>
        <EnsureParentAccess />
      </Suspense>
      {children}
    </AppShell>
  );
}
