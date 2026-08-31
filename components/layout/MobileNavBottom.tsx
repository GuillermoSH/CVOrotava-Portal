"use client";

import { SidebarNav } from "@/components/layout/SidebarNav";
import { cn } from "@/lib/utils";

export function MobileNavBottom({ homeHref }: { homeHref: string }) {
  return (
    <nav
      aria-label="Principal"
      className={cn(
        "shell-dock fixed inset-x-0 bottom-0 z-40 flex h-14 min-h-14 items-stretch px-1",
        "pb-[max(0.25rem,env(safe-area-inset-bottom))] lg:hidden",
      )}
    >
      <SidebarNav homeHref={homeHref} variant="dock" />
    </nav>
  );
}
