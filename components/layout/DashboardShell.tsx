"use client";

import { ChevronsLeft, ChevronsRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { MobileNavBottom } from "@/components/layout/MobileNavBottom";
import { MobileNavTop } from "@/components/layout/MobileNavTop";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/club/Button";
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
                aria-label="Inicio — Club Voleibol Orotava"
              >
                <Logo className="size-9 shrink-0" />
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
              <div className="flex items-center gap-2 px-2 pb-1">
                <Link
                  href={homeHref}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-[var(--club-surface)]"
                >
                  <Logo className="size-9 shrink-0" />
                  <span className="truncate text-base font-semibold tracking-[-0.02em] text-foreground">
                    CVOrotava
                  </span>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0"
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
          <main className="scrollbar-hidden flex-1 overflow-auto px-4 py-6 pb-[calc(4rem+max(0.5rem,env(safe-area-inset-bottom,0px)))] md:px-6 lg:pb-8 lg:pt-8">
            {children}
          </main>
        </div>
      </div>

      <MobileNavBottom homeHref={homeHref} />
    </div>
  );
}
