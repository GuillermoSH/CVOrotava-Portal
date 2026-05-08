"use client";

import { SidebarNav } from "@/components/layout/SidebarNav";
import { cn } from "@/lib/utils";

export function MobileNavBottom() {
  return (
    <nav
      aria-label="Principal"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex h-14 min-h-14 items-center justify-center border-t border-border bg-card px-3",
        "pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden",
      )}
    >
      <SidebarNav variant="dock" />
    </nav>
  );
}
