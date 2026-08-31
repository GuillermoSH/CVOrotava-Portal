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
      className={cn("clothing-filter-chips", className)}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "clothing-filter-chip inline-flex items-center",
            value === opt.value && "clothing-filter-chip--active",
          )}
        >
          <span>{opt.label}</span>
          {opt.count !== undefined ? (
            <span
              className={cn(
                "ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                value === opt.value
                  ? "bg-brand/15 text-brand"
                  : "bg-[var(--club-surface-2)] text-muted-foreground",
              )}
              aria-hidden
            >
              {opt.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
