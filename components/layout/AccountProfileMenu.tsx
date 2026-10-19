"use client";

import { CircleUserRound, EllipsisVertical, LogOut } from "lucide-react";

import { ThemeSubmenu } from "@/components/shared/ThemeSubmenu";
import { Button } from "@/components/club/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/club/DropdownMenu";
import { userInitials } from "@/lib/user-initials";
import { cn } from "@/lib/utils";

export function AccountProfileMenu({
  userName,
  userRole,
  onViewProfile,
  onLogout,
  showViewProfile = false,
  showThemeSubmenu = true,
  showLogout = true,
  contentAlign = "end",
  triggerClassName,
  contentSide = "bottom",
  triggerAriaLabel = "Cuenta y ajustes",
  layout = "icon",
  collapsed = false,
}: {
  userName: string;
  userRole: string;
  onViewProfile?: () => void;
  onLogout?: () => void;
  showViewProfile?: boolean;
  showThemeSubmenu?: boolean;
  showLogout?: boolean;
  contentAlign?: "start" | "center" | "end";
  triggerClassName?: string;
  contentSide?: "top" | "bottom" | "left" | "right";
  triggerAriaLabel?: string;
  /** `row`: fila compacta (avatar + nombre + rol) para el pie del menú lateral; altura fija en ambos estados. */
  layout?: "icon" | "row";
  /** Solo con `layout="row"`: muestra solo el avatar. */
  collapsed?: boolean;
}) {
  const canShowViewProfile = showViewProfile && onViewProfile;
  const canShowLogout = showLogout && onLogout;
  const hasActions = showThemeSubmenu || canShowViewProfile || canShowLogout;

  return (
    <DropdownMenu>
      {layout === "row" ? (
        <DropdownMenuTrigger
          nativeButton
          render={
            <button
              type="button"
              aria-label={collapsed ? `Cuenta de ${userName}` : triggerAriaLabel}
              title={collapsed ? `${userName} · ${userRole}` : undefined}
              className={cn(
                "flex w-full cursor-pointer items-center overflow-hidden rounded-xl p-2 text-left outline-none transition-colors",
                "hover:bg-[var(--club-surface)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--club-brand)_40%,transparent)]",
                "aria-expanded:bg-[var(--club-surface)]",
                collapsed ? "justify-center" : "gap-3",
              )}
            />
          }
        >
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold text-brand",
              "bg-[var(--club-brand-soft)]",
            )}
            aria-hidden
          >
            {userInitials(userName)}
          </span>
          {collapsed ? null : (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{userName}</span>
                <span className="block truncate text-xs text-muted-foreground">{userRole}</span>
              </span>
              <EllipsisVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </>
          )}
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger
          nativeButton
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={triggerAriaLabel}
              className={cn(
                "size-9 shrink-0 rounded-md font-semibold tabular-nums",
                triggerClassName,
              )}
            />
          }
        >
          {userInitials(userName)}
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent align={contentAlign} side={contentSide} className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <span className="block truncate text-sm font-medium text-foreground">{userName}</span>
            <span className="block truncate text-xs text-muted-foreground">{userRole}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        {hasActions ? <DropdownMenuSeparator /> : null}
        {showThemeSubmenu ? <ThemeSubmenu /> : null}
        {showThemeSubmenu && (canShowViewProfile || canShowLogout) ? (
          <DropdownMenuSeparator />
        ) : null}
        {canShowViewProfile ? (
          <DropdownMenuItem onClick={onViewProfile}>
            <CircleUserRound className="size-4" />
            Consultar tu perfil
          </DropdownMenuItem>
        ) : null}
        {canShowViewProfile && canShowLogout ? <DropdownMenuSeparator /> : null}
        {canShowLogout ? (
          <DropdownMenuItem variant="destructive" onClick={onLogout}>
            <LogOut className="size-4" />
            Cerrar sesión
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
