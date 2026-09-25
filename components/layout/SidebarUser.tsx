"use client";

import { LogOut } from "lucide-react";

import { AccountProfileMenu } from "@/components/layout/AccountProfileMenu";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { signOut } from "@/lib/actions/auth";
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
  function handleLogout() {
    void signOut();
  }

  if (collapsed) {
    return (
      <div className="flex justify-center border-t border-border pt-3">
        <AccountProfileMenu
          userName={user.name}
          userRole={user.role}
          onLogout={handleLogout}
          contentAlign="end"
          contentSide="right"
          triggerClassName="bg-[var(--club-brand-soft)] text-xs font-semibold text-brand"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center gap-3 px-1">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full border border-border",
            "bg-[var(--club-brand-soft)] text-xs font-semibold text-brand",
          )}
          aria-hidden
        >
          {userInitials(user.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.role}</p>
        </div>
        <ThemeToggle variant="compact" />
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="btn-secondary flex w-full items-center justify-center gap-2 py-2.5 text-sm"
      >
        <LogOut className="size-4" aria-hidden />
        Cerrar sesión
      </button>
    </div>
  );
}
