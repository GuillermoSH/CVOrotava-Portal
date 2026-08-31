"use client";

import { CircleUserRound, LogOut } from "lucide-react";

import { ThemeSubmenu } from "@/components/shared/ThemeSubmenu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
}) {
  const canShowViewProfile = showViewProfile && onViewProfile;
  const canShowLogout = showLogout && onLogout;
  const hasActions = showThemeSubmenu || canShowViewProfile || canShowLogout;

  return (
    <DropdownMenu>
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
