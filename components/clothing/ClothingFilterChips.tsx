"use client";

import { cn } from "@/lib/utils";

export function ClothingFilterChips<T extends string>({
  options,
  value,
  onChange,
  className,
  ariaLabel = "Filtros",
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("ropa-filter-chips clothing-filter-chips", className)}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "ropa-filter-chip clothing-filter-chip inline-flex items-center",
            value === opt.value && "ropa-filter-chip--active clothing-filter-chip--active",
          )}
        >
          <span>{opt.label}</span>
          {opt.count !== undefined ? (
            <span className="ropa-filter-chip__count ropa-digit" aria-hidden>
              {opt.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
