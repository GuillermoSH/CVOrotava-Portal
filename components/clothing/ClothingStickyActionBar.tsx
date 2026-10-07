"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/club/Button";
import { MobileStickyActionBar } from "@/components/layout/MobileStickyActionBar";
import { cn } from "@/lib/utils";

type ActionBase = {
  /** Icono opcional (p. ej. ChevronLeft). Si hay icono y no label, es solo icono. */
  icon?: ReactNode;
  /** Nombre accesible cuando el botón es solo icono. */
  "aria-label"?: string;
  disabled?: boolean;
};

type ButtonAction = ActionBase & {
  type: "button";
  label?: string;
  onClick: () => void;
  pending?: boolean;
  variant?: "primary" | "secondary" | "destructive";
  /** Primario ocupa el resto del ancho en layout split. */
  primacy?: "primary" | "leading";
};

type LinkAction = ActionBase & {
  type: "link";
  label?: string;
  href: string;
  variant?: "primary" | "secondary";
  primacy?: "primary" | "leading";
};

type Action = ButtonAction | LinkAction;

export function ClothingStickyActionBar({
  actions,
  className,
  layout = "stack",
}: {
  actions: Action[];
  className?: string;
  /**
   * `stack` — botones a ancho completo apilados.
   * `row` — todos flex-1 en fila (legado).
   * `split` — leading (iconos/secundarios) + primary a la derecha a ancho restante.
   */
  layout?: "stack" | "row" | "split";
}) {
  const leading = actions.filter((a) => (a.primacy ?? "leading") !== "primary");
  const primary = actions.filter((a) => a.primacy === "primary");
  const split = layout === "split";
  const singlePrimary =
    !split &&
    actions.filter((a) => a.type !== "link" || a.variant !== "secondary").length === 1 &&
    actions.filter((a) => a.type === "link" && a.variant === "secondary").length === 0;

  function renderAction(action: Action, i: number, slot: "leading" | "primary" | "row") {
    const iconOnly = Boolean(action.icon) && !action.label;
    const isPrimary = slot === "primary" || (slot === "row" && action.primacy === "primary");
    const baseClass = cn(
      "inline-flex items-center justify-center gap-1.5 text-sm",
      iconOnly ? "size-11 shrink-0 !px-0" : "min-h-11",
      !iconOnly && slot === "leading" && "shrink-0 whitespace-nowrap px-3",
      !iconOnly && slot === "primary" && "min-w-0 flex-1 whitespace-nowrap",
      !iconOnly && slot === "row" && "min-w-0 flex-1 whitespace-nowrap",
      !iconOnly && layout === "stack" && "btn-primary--block",
      singlePrimary && layout === "stack" && "min-h-12 text-base",
      isPrimary && "font-semibold",
    );

    if (action.type === "link") {
      return (
        <Link
          key={i}
          href={action.href}
          aria-label={action["aria-label"]}
          className={cn(
            action.variant === "secondary" || iconOnly ? "btn-secondary" : "btn-primary",
            baseClass,
          )}
        >
          {action.icon}
          {action.label ? <span className="truncate">{action.label}</span> : null}
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
            : action.variant === "secondary" || iconOnly
              ? "secondary"
              : "primary"
        }
        className={baseClass}
        disabled={action.disabled || action.pending}
        aria-label={action["aria-label"]}
        onClick={action.onClick}
      >
        {action.icon}
        {action.pending ? (
          "Guardando…"
        ) : action.label ? (
          <span className="truncate">{action.label}</span>
        ) : null}
      </Button>
    );
  }

  return (
    <MobileStickyActionBar className={className}>
      <div
        className={cn(
          "clothing-sticky-bar__inner",
          singlePrimary && "clothing-sticky-bar__inner--solo",
          layout === "row" && "clothing-sticky-bar__inner--row",
          split && "clothing-sticky-bar__inner--split",
        )}
      >
        {split ? (
          <>
            <div className="clothing-sticky-bar__leading">
              {leading.map((action, i) => renderAction(action, i, "leading"))}
            </div>
            <div className="clothing-sticky-bar__primary">
              {primary.map((action, i) => renderAction(action, i + leading.length, "primary"))}
            </div>
          </>
        ) : (
          actions.map((action, i) => renderAction(action, i, "row"))
        )}
      </div>
    </MobileStickyActionBar>
  );
}
