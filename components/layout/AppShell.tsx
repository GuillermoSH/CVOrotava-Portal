import Link from "next/link";

import { SidebarNav } from "@/components/layout/SidebarNav";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { appRoutes } from "@/lib/constants";

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
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-border bg-card px-4 py-6 md:h-auto md:w-56 md:min-h-0 md:border-b-0 md:border-r">
        <div className="shrink-0 space-y-2">
          <Link href={appRoutes.home} className="flex items-center gap-2">
            <Logo className="size-9" />
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Portal
              </span>
              <span className="text-sm font-semibold text-foreground">CVOrotava</span>
            </div>
          </Link>
          <p className="text-xs text-muted-foreground">{navTitle}</p>
          <SidebarNav />
        </div>
        <div className="min-h-4 flex-1" aria-hidden />
        <SidebarUser user={sidebarUser} />
      </aside>
      <div className="flex min-h-0 flex-1 flex-col bg-background">
        <header className="flex flex-row items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
          <h1 className="text-sm font-medium text-muted-foreground">{navTitle}</h1>
          <ThemeToggle align="end" />
        </header>
        <main className="flex-1 overflow-auto px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
