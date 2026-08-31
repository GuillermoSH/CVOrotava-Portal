import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { requirePortalRole } from "@/lib/auth/portal-access";
import { appRoutes } from "@/lib/constants";

export default async function ParentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await requirePortalRole();

  if (role !== "parent") {
    redirect(appRoutes.admin);
  }

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
