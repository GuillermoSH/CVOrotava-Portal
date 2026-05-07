"use client";

import { ChevronsLeft, ChevronsRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { MobileNavBottom } from "@/components/layout/MobileNavBottom";
import { MobileNavTop } from "@/components/layout/MobileNavTop";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/lib/constants";
import { readSidebarCollapsed, writeSidebarCollapsed } from "@/lib/layout/shell-storage";
import { cn } from "@/lib/utils";

export function DashboardShell({
  children,
  navTitle,
  sidebarUser,
}: {
  children: React.ReactNode;
  navTitle: string;
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

  const showDesktopHeaderTheme = !sidebarCollapsed;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden lg:flex-row">
      <MobileNavTop navTitle={navTitle} user={sidebarUser} />

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row",
          "pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] lg:pb-0",
        )}
      >
        <aside
          className={cn(
            "relative hidden min-h-0 shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 ease-out lg:flex",
            sidebarCollapsed ? "w-[4.5rem] px-2 py-6" : "w-56 px-4 py-6",
          )}
        >
          {sidebarCollapsed ? (
            <div className="flex shrink-0 flex-col items-center gap-3">
              <Link
                href={appRoutes.home}
                className="flex rounded-md p-1 hover:bg-muted/60"
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
            <div className="flex shrink-0 flex-col gap-2">
              <div className="flex items-start gap-2">
                <Link
                  href={appRoutes.home}
                  className="flex min-w-0 flex-1 items-start gap-2 rounded-md p-1 hover:bg-muted/60"
                >
                  <Logo className="size-9 shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Portal
                    </span>
                    <span className="truncate text-sm font-semibold text-foreground">CVOrotava</span>
                  </div>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="mt-0.5 shrink-0"
                  onClick={toggleSidebar}
                  aria-expanded
                  aria-label="Contraer menú lateral"
                >
                  <ChevronsLeft className="size-4" aria-hidden />
                </Button>
              </div>
              <SidebarNav collapsed={false} />
            </div>
          )}

          {sidebarCollapsed ? <SidebarNav collapsed /> : null}

          <div className="min-h-4 flex-1" aria-hidden />
          <SidebarUser user={sidebarUser} collapsed={sidebarCollapsed} />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
          <header className="hidden items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6 lg:flex">
            <h1 className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground">{navTitle}</h1>
            {showDesktopHeaderTheme ? (
              <div className="shrink-0">
                <ThemeToggle align="end" />
              </div>
            ) : null}
          </header>
          <main className="flex-1 overflow-auto px-4 py-6 md:px-6">{children}</main>
        </div>
      </div>

      <MobileNavBottom />
    </div>
  );
}
