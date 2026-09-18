import type { ReactNode } from "react";

import { WarehouseBoxMark } from "@/components/clothing/WarehouseBoxMark";
import { cn } from "@/lib/utils";

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
  className?: string;
}) {
  const classNames = cn(
    "warehouse-crate",
    variant === "inventory" && "warehouse-crate--inventory",
    variant === "pick" && "warehouse-crate--pick",
    onSelect && "warehouse-crate--interactive",
    className,
  );

  const meta =
    [home, !children ? emptyLabel : undefined].filter(Boolean).join(" · ") || null;

  const inner = (
    <>
      <div className="warehouse-crate__figure">
        <WarehouseBoxMark size={variant === "manage" ? "md" : "sm"} />
      </div>
      <div className="warehouse-crate__body">
        <div className="warehouse-crate__identity">
          <p className="warehouse-crate__code">{code}</p>
          <p className="warehouse-crate__label">{label}</p>
        </div>
        {meta ? <p className="warehouse-crate__meta">{meta}</p> : null}
        {children}
      </div>
      {actions ? <div className="warehouse-crate__actions-slot">{actions}</div> : null}
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={classNames}
      >
        {inner}
      </button>
    );
  }

  return <article className={classNames}>{inner}</article>;
}
