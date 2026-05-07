import { DashboardShell } from "@/components/layout/DashboardShell";

export function AppShell({
  children,
  navTitle,
  sidebarUser,
}: {
  children: React.ReactNode;
  navTitle: string;
  sidebarUser?: { name: string; role: string };
}) {
  return (
    <DashboardShell navTitle={navTitle} sidebarUser={sidebarUser}>
      {children}
    </DashboardShell>
  );
}
