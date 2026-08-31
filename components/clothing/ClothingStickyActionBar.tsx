"use client";

import Link from "next/link";
import { createPortal } from "react-dom";

import { Button } from "@/components/club/Button";
import { cn } from "@/lib/utils";

type Action =
  | {
      type: "button";
      label: string;
      onClick: () => void;
      disabled?: boolean;
      pending?: boolean;
      variant?: "primary" | "secondary" | "destructive";
    }
  | {
      type: "link";
      label: string;
      href: string;
      variant?: "primary" | "secondary";
    };

export function ClothingStickyActionBar({
  actions,
  className,
}: {
  actions: Action[];
  className?: string;
}) {
  if (typeof document === "undefined") return null;

  const primaryActions = actions.filter(
    (action) => action.type !== "link" || action.variant !== "secondary",
  );
  const secondaryLinks = actions.filter(
    (action): action is Extract<Action, { type: "link" }> =>
      action.type === "link" && action.variant === "secondary",
  );
  const singlePrimary = primaryActions.length === 1 && secondaryLinks.length === 0;

  return createPortal(
    <div className={cn("clothing-sticky-bar md:hidden", className)}>
      <div
        className={cn(
          "clothing-sticky-bar__inner",
          singlePrimary && "clothing-sticky-bar__inner--solo",
        )}
      >
        {actions.map((action, i) => {
          if (action.type === "link") {
            return (
              <Link
                key={i}
                href={action.href}
                className={cn(
                  action.variant === "secondary" ? "btn-secondary" : "btn-primary",
                  "btn-primary--block min-h-11",
                )}
              >
                {action.label}
              </Link>
            );
          }
          return (
            <Button
              key={i}
              type="button"
              variant={
                action.variant === "destructive"
                  ? "destructive"
                  : action.variant === "secondary"
                    ? "secondary"
                    : "primary"
              }
              className={cn("btn-primary--block min-h-11", singlePrimary && "min-h-12 text-base")}
              disabled={action.disabled || action.pending}
              onClick={action.onClick}
            >
              {action.pending ? "Guardando…" : action.label}
            </Button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
