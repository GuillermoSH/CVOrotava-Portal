"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { AccountProfileMenu } from "@/components/layout/AccountProfileMenu";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/lib/constants";
import { userInitials } from "@/lib/user-initials";
import { cn } from "@/lib/utils";

const defaultUser = {
  name: "Dirección CVO",
  role: "Dirección",
} as const;

export function SidebarUser({
  user = defaultUser,
  collapsed = false,
}: {
  user?: { name: string; role: string };
  collapsed?: boolean;
}) {
  const router = useRouter();

  function handleLogout() {
    router.push(appRoutes.home);
  }

  if (collapsed) {
    return (
      <div className="flex justify-center">
        <AccountProfileMenu
          userName={user.name}
          userRole={user.role}
          onLogout={handleLogout}
          contentAlign="end"
          contentSide="right"
          triggerClassName="bg-muted text-xs font-semibold text-foreground hover:bg-muted/80"
        />
      </div>
    );
  }

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
          {userInitials(user.name)}
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
        onClick={handleLogout}
      >
        <LogOut className="size-4" />
        Cerrar sesión
      </Button>
    </div>
  );
}
