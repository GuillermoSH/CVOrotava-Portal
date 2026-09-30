"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  "aria-label": string;
  label?: string;
  className?: string;
  /** `sm` = control que abraza el contenido (p. ej. Sexo). */
  size?: "sm" | "md";
  /** Estira el grupo al 100% y reparte los botones. */
  fullWidth?: boolean;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
  label,
  className = "",
  size = "md",
  fullWidth = false,
}: SegmentedControlProps<T>) {
  const compact = size === "sm";

  const control = (
    <div
      className={cn(
        "inline-flex max-w-full overflow-x-auto border border-border bg-[var(--club-surface-2)]",
        compact ? "rounded-lg p-0.5" : "rounded-xl p-1",
        fullWidth && "w-full",
        !label && className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              compact
                ? "h-8 rounded-md px-2.5 text-[11px]"
                : "h-9 rounded-lg px-3 text-xs",
              fullWidth && "min-w-0 flex-1",
              active
                ? "bg-[var(--club-brand-soft)] text-brand ring-1 ring-[color-mix(in_srgb,var(--club-brand)_32%,transparent)]"
                : "text-muted-foreground hover:bg-[var(--club-surface-hover)] hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  if (!label) return control;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {control}
    </div>
  );
}
