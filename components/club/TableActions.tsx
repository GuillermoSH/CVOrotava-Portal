"use client";

import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/club/Button";
import { TableCell } from "@/components/club/Table";
import { Tooltip, TooltipGroup } from "@/components/club/Tooltip";
import { cn } from "@/lib/utils";

function stopRowActivation(e: React.SyntheticEvent) {
  e.stopPropagation();
}

export function TableActionsCell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <TableCell
      className={cn("club-table__actions", className)}
      onClick={stopRowActivation}
      onKeyDown={stopRowActivation}
    >
      <TooltipGroup>
        <div className="club-table__actions-inner">{children}</div>
      </TooltipGroup>
    </TableCell>
  );
}

export function TableIconAction({
  label,
  icon: Icon,
  onClick,
  disabled,
  destructive,
  className,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  className?: string;
}) {
  return (
    <Tooltip label={label}>
      <Button
        type="button"
        variant="ghost"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "club-table__action-btn",
          destructive && "text-destructive hover:text-destructive",
          className,
        )}
      >
        <Icon className="size-4" aria-hidden />
      </Button>
    </Tooltip>
  );
}

export function TableTextAction({
  label,
  onClick,
  disabled,
  className,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={cn("min-h-9 shrink-0", className)}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
