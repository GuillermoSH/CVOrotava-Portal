"use client";

import { ChevronsLeft, ChevronsRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { DashboardMain } from "@/components/layout/DashboardMain";
import { DashboardNavigationProvider } from "@/components/layout/DashboardNavigation";
import { MobileNavBottom } from "@/components/layout/MobileNavBottom";
import { MobileNavTop } from "@/components/layout/MobileNavTop";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/club/Button";
import { CLUB_NAME } from "@/lib/brand/club";
import { readSidebarCollapsed, writeSidebarCollapsed } from "@/lib/layout/shell-storage";
import { cn } from "@/lib/utils";

export function DashboardShell({
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
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  React.useEffect(() => {
    setSidebarCollapsed(readSidebarCollapsed());
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      writeSidebarCollapsed(next);
      return next;
    });
  }

  return (
    <DashboardNavigationProvider>
      <div className="relative flex h-dvh flex-col overflow-hidden lg:flex-row">
      <MobileNavTop navTitle={navTitle} homeHref={homeHref} user={sidebarUser} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
        <aside
          className={cn(
            "shell-sidebar relative hidden min-h-0 shrink-0 flex-col transition-[width] duration-200 ease-out lg:flex",
            sidebarCollapsed ? "w-[4.5rem] px-2 py-5" : "w-56 px-3 py-5",
          )}
          aria-label="Navegación principal"
        >
          {sidebarCollapsed ? (
            <div className="flex shrink-0 flex-col items-center gap-3">
              <Link
                href={homeHref}
                className="flex rounded-lg p-1 transition-colors hover:bg-[var(--club-surface)]"
                aria-label={`Inicio — ${CLUB_NAME}`}
              >
                <Logo className="size-11 shrink-0" px={48} />
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="shrink-0"
                onClick={toggleSidebar}
                aria-expanded={false}
                aria-label="Expandir menú lateral"
              >
                <ChevronsRight className="size-4" aria-hidden />
              </Button>
            </div>
          ) : (
            <div className="flex shrink-0 flex-col gap-1">
              <div className="relative flex items-center justify-center px-2 pb-2 pt-0.5">
                <Link
                  href={homeHref}
                  className="flex rounded-lg p-1 transition-colors hover:bg-[var(--club-surface)]"
                  aria-label={`Inicio — ${CLUB_NAME}`}
                >
                  <Logo className="size-12 shrink-0" px={56} />
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="absolute right-1 top-1/2 shrink-0 -translate-y-1/2"
                  onClick={toggleSidebar}
                  aria-expanded
                  aria-label="Contraer menú lateral"
                >
                  <ChevronsLeft className="size-4" aria-hidden />
                </Button>
              </div>
              <SidebarNav homeHref={homeHref} collapsed={false} />
            </div>
          )}

          {sidebarCollapsed ? <SidebarNav homeHref={homeHref} collapsed /> : null}

          <div className="min-h-4 flex-1" aria-hidden />
          <SidebarUser user={sidebarUser} collapsed={sidebarCollapsed} />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
          <DashboardMain>{children}</DashboardMain>
        </div>
      </div>

      <MobileNavBottom homeHref={homeHref} />
      </div>
    </DashboardNavigationProvider>
  );
}
