import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { requirePortalRole } from "@/lib/auth/portal-access";
import { appRoutes } from "@/lib/constants";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await requirePortalRole();

  if (role === "parent") {
    redirect(appRoutes.parents);
  }

  return <AppShell navTitle="Área dirección">{children}</AppShell>;
}
