"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AccountProfileMenu } from "@/components/layout/AccountProfileMenu";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/lib/constants";
import { cn } from "@/lib/utils";

const defaultUser = {
  name: "Dirección CVO",
  role: "Dirección",
} as const;

export function MobileNavTop({
  navTitle,
  user = defaultUser,
}: {
  navTitle: string;
  user?: { name: string; role: string };
}) {
  const router = useRouter();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-10 min-h-10 shrink-0 items-center gap-2 border-b border-border bg-card/95 px-2.5 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-3",
        "lg:hidden",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Link
          href={appRoutes.home}
          className="shrink-0 rounded-md p-0.5 hover:bg-muted/60"
          aria-label="Inicio — Club Voleibol Orotava"
        >
          <Logo className="size-7 sm:size-8" />
        </Link>
        <p className="min-w-0 truncate text-sm font-medium text-foreground">{navTitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <AccountProfileMenu
          userName={user.name}
          userRole={user.role}
          showThemeSubmenu={false}
          showLogout={false}
          contentAlign="end"
          contentSide="bottom"
          triggerAriaLabel="Perfil"
          triggerClassName="size-8 bg-muted/50 text-[11px] font-semibold sm:size-9"
        />
        <ThemeToggle align="end" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground sm:px-2.5"
          onClick={() => {
            router.push(appRoutes.home);
          }}
        >
          <span>Salir</span>
          <LogOut className="size-3.5 shrink-0 sm:size-4" aria-hidden />
        </Button>
      </div>
    </header>
  );
}
