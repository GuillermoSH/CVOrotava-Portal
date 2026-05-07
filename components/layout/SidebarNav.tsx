"use client";

import { Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { appRoutes } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SidebarNav() {
  const pathname = usePathname();
  const homeActive = pathname === appRoutes.home;

  return (
    <nav aria-label="Principal" className="mt-4">
      <ul className="space-y-1">
        <li>
          <Link
            href={appRoutes.home}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              homeActive
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Home className="size-4 shrink-0" aria-hidden />
            Inicio
          </Link>
        </li>
      </ul>
    </nav>
  );
}
