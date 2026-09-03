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
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
  label,
  className = "",
}: SegmentedControlProps<T>) {
  const control = (
    <div
      className={cn(
        "inline-flex max-w-full overflow-x-auto rounded-xl border border-border bg-[var(--club-surface-2)] p-1",
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
              "inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
