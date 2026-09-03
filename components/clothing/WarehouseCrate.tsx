import type { ReactNode } from "react";

import { WarehouseBoxMark } from "@/components/clothing/WarehouseBoxMark";
import { cn } from "@/lib/utils";

export function WarehouseCrate({
  code,
  label,
  home,
  variant = "manage",
  selected = false,
  filled = false,
  onSelect,
  menu,
  children,
  emptyLabel,
  className,
}: {
  code: string;
  label: string;
  home?: string;
  variant?: "manage" | "inventory" | "pick";
  selected?: boolean;
  filled?: boolean;
  onSelect?: () => void;
  menu?: ReactNode;
  children?: ReactNode;
  emptyLabel?: string;
  className?: string;
}) {
  const classNames = cn(
    "warehouse-crate",
    variant === "inventory" && "warehouse-crate--inventory",
    variant === "pick" && "warehouse-crate--pick",
    onSelect && "warehouse-crate--interactive",
    filled && "warehouse-crate--filled",
    className,
  );

  const markSize = variant === "manage" ? "md" : "sm";

  const inner = (
    <>
      <div className="warehouse-crate__figure">
        <WarehouseBoxMark code={code} filled={filled} size={markSize} />
        {menu ? <div className="warehouse-crate__menu-slot">{menu}</div> : null}
      </div>
      <div className="warehouse-crate__body">
        <p className="warehouse-crate__label">{label}</p>
        {home ? <p className="warehouse-crate__home">{home}</p> : null}
        {children}
        {!children && emptyLabel ? <p className="warehouse-crate__empty">{emptyLabel}</p> : null}
      </div>
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
