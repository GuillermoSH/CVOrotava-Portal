import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Text-first location tile for pick/manage surfaces (no decorative box SVG).
 * Inventory board uses `ropa-bin` in InventoryBoxBoard instead.
 */
export function WarehouseCrate({
  code,
  label,
  home,
  variant = "manage",
  selected = false,
  onSelect,
  actions,
  children,
  emptyLabel,
  unitCount,
  className,
}: {
  code: string;
  label: string;
  home?: string;
  variant?: "manage" | "inventory" | "pick";
  selected?: boolean;
  onSelect?: () => void;
  actions?: ReactNode;
  children?: ReactNode;
  emptyLabel?: string;
  unitCount?: number;
  className?: string;
}) {
  const isEmpty = !children;
  const classNames = cn(
    "ropa-loc",
    variant === "pick" && "ropa-loc--pick",
    variant === "inventory" && "ropa-loc--inventory",
    onSelect && "ropa-loc--interactive",
    isEmpty && "ropa-loc--empty",
    selected && "ropa-loc--selected",
    className,
  );

  const meta =
    [home, isEmpty ? emptyLabel : undefined].filter(Boolean).join(" · ") || null;
  const showScore =
    typeof unitCount === "number" && unitCount > 0 && variant !== "manage";

  const inner = (
    <>
      <div className="ropa-loc__head">
        <div className="ropa-loc__id">
          <p className="ropa-loc__code">{code}</p>
          <p className="ropa-loc__label">{label}</p>
          {meta ? <p className="ropa-loc__meta">{meta}</p> : null}
        </div>
        <div className="ropa-loc__end">
          {showScore ? (
            <p className="ropa-loc__score">
              <span className="ropa-digit ropa-digit--sm">{unitCount}</span>
              <span className="ropa-loc__score-unit">ud</span>
            </p>
          ) : null}
          {actions ? <div className="ropa-loc__actions">{actions}</div> : null}
        </div>
      </div>
      {children}
    </>
  );

  if (onSelect) {
    return (
      <button type="button" aria-pressed={selected} onClick={onSelect} className={classNames}>
        {inner}
      </button>
    );
  }

  return <article className={classNames}>{inner}</article>;
}
