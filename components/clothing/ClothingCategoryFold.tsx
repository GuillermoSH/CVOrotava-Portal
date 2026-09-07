"use client";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export function ClothingCategoryFold({
  id,
  label,
  count,
  open,
  onToggle,
  children,
}: {
  id: string;
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const panelId = `${id}-panel`;

  return (
    <div className="clothing-sheet-group" data-open={open ? "true" : "false"}>
      <button
        type="button"
        id={id}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${label}, ${count} ${count === 1 ? "opción" : "opciones"}`}
        onClick={onToggle}
        className="clothing-sheet-fold"
      >
        <span className="clothing-sheet-fold__label">{label}</span>
        <span className="clothing-sheet-fold__meta">
          <span className="clothing-sheet-fold__count">{count}</span>
          <ChevronDown
            className={cn("clothing-sheet-fold__chevron", open && "is-open")}
            aria-hidden
          />
        </span>
      </button>
      {open ? (
        <div id={panelId} role="region" aria-labelledby={id} className="clothing-sheet-group__items">
          {children}
        </div>
      ) : null}
    </div>
  );
}
