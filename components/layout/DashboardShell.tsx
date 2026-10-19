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
import { useSidebarCollapsed } from "@/lib/layout/shell-storage";
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
  const [sidebarCollapsed, toggleSidebar] = useSidebarCollapsed();

  return (
    <DashboardNavigationProvider>
      <div className="relative flex h-dvh flex-col overflow-hidden lg:flex-row">
      <MobileNavTop navTitle={navTitle} homeHref={homeHref} user={sidebarUser} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
        {/* Como en Team-Manager: menú `fixed` con ancho por variable CSS y contenido desplazado por margen. */}
        <aside
          className={cn(
            "shell-sidebar fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-width)] flex-col py-5 transition-[width] duration-200 ease-out motion-reduce:transition-none lg:flex",
            sidebarCollapsed ? "px-2" : "px-3",
          )}
          aria-label="Navegación principal"
        >
          {/* Un solo árbol para ambos estados: así no se remonta nada al animar el ancho. */}
          <div className="flex shrink-0 flex-col gap-1">
            <div
              className={cn(
                "relative flex items-center justify-center",
                sidebarCollapsed ? "flex-col gap-3" : "px-2 pb-2 pt-0.5",
              )}
            >
              <Link
                href={homeHref}
                className="flex rounded-lg p-1 transition-colors hover:bg-[var(--club-surface)]"
                aria-label={`Inicio — ${CLUB_NAME}`}
              >
                <Logo className={cn("shrink-0", sidebarCollapsed ? "size-11" : "size-12")} px={sidebarCollapsed ? 48 : 56} />
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className={cn("shrink-0", !sidebarCollapsed && "absolute right-1 top-1/2 -translate-y-1/2")}
                onClick={toggleSidebar}
                aria-expanded={!sidebarCollapsed}
                aria-label={sidebarCollapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
              >
                {sidebarCollapsed ? (
                  <ChevronsRight className="size-4" aria-hidden />
                ) : (
                  <ChevronsLeft className="size-4" aria-hidden />
                )}
              </Button>
            </div>
            <SidebarNav homeHref={homeHref} collapsed={sidebarCollapsed} />
          </div>

          <div className="min-h-4 flex-1" aria-hidden />
          <SidebarUser user={sidebarUser} collapsed={sidebarCollapsed} />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background lg:ml-[var(--sidebar-width)] lg:transition-[margin-left] lg:duration-200 lg:ease-out motion-reduce:lg:transition-none">
          <DashboardMain>{children}</DashboardMain>
        </div>
      </div>

      <MobileNavBottom homeHref={homeHref} />
      </div>
    </DashboardNavigationProvider>
  );
}
