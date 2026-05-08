"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AccountProfileMenu } from "@/components/layout/AccountProfileMenu";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
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
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-10 min-h-10 shrink-0 items-center gap-2 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:px-6",
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
      <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        <ThemeToggle
          align="end"
          triggerVariant="ghost"
          triggerClassName="size-8 border-0 bg-transparent text-foreground hover:bg-transparent aria-expanded:bg-transparent sm:size-9"
          iconClassName="text-foreground"
        />
        {mounted ? (
          <AccountProfileMenu
            userName={user.name}
            userRole={user.role}
            onViewProfile={() => {
              router.push(appRoutes.profile);
            }}
            onLogout={() => {
              router.push(appRoutes.home);
            }}
            showViewProfile
            showThemeSubmenu={false}
            contentAlign="end"
            contentSide="bottom"
            triggerAriaLabel="Perfil"
            triggerClassName="size-8 rounded-full border border-brand/70 bg-brand text-primary-foreground text-[11px] font-semibold hover:bg-brand/90 sm:size-9"
          />
        ) : (
          <div className="size-8 rounded-full border border-brand/70 bg-brand sm:size-9" />
        )}
      </div>
    </header>
  );
}
