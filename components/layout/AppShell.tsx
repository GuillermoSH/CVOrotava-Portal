import { DashboardShell } from "@/components/layout/DashboardShell";
import { DevAuthBypassBanner } from "@/components/shared/DevAuthBypassBanner";

export function AppShell({
  children,
  navTitle,
  homeHref,
  sidebarUser,
}: {
  children: React.ReactNode;
  navTitle: string;
  homeHref: string;
  sidebarUser?: { name: string; role: string };
}) {
  return (
    <>
      <DevAuthBypassBanner />
      <DashboardShell
        navTitle={navTitle}
        homeHref={homeHref}
        sidebarUser={sidebarUser}
      >
        {children}
      </DashboardShell>
    </>
  );
}
