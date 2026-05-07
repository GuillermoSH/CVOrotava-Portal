"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { appRoutes } from "@/lib/constants";
import { cn } from "@/lib/utils";

const defaultUser = {
  name: "Dirección CVO",
  role: "Dirección",
} as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function SidebarUser({
  user = defaultUser,
}: {
  user?: { name: string; role: string };
}) {
  const router = useRouter();

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md",
            "bg-muted text-xs font-semibold text-foreground",
          )}
          aria-hidden
        >
          {initials(user.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.role}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        className="mt-3 w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        onClick={() => router.push(appRoutes.home)}
      >
        <LogOut className="size-4" />
        Cerrar sesión
      </Button>
    </div>
  );
}
