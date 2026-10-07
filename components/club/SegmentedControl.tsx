"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
};

type SegmentedSize = "sm" | "md";

function segmentedShellClassName({
  size,
  fullWidth,
  className,
}: {
  size: SegmentedSize;
  fullWidth?: boolean;
  className?: string;
}) {
  const compact = size === "sm";
  return cn(
    "inline-flex max-w-full overflow-x-auto border border-border bg-[var(--club-surface-2)]",
    compact ? "rounded-lg p-0.5" : "rounded-xl p-1",
    fullWidth && "w-full",
    className,
  );
}

function segmentedItemClassName({
  size,
  fullWidth,
  active,
}: {
  size: SegmentedSize;
  fullWidth?: boolean;
  active: boolean;
}) {
  const compact = size === "sm";
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    compact ? "h-8 rounded-md px-2.5 text-[11px]" : "h-9 rounded-lg px-3 text-xs",
    fullWidth && "min-w-0 flex-1",
    active
      ? "bg-[var(--club-brand-soft)] text-brand ring-1 ring-[color-mix(in_srgb,var(--club-brand)_32%,transparent)]"
      : "text-muted-foreground hover:bg-[var(--club-surface-hover)] hover:text-foreground",
  );
}

type SegmentedControlProps<T extends string> = {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  "aria-label": string;
  label?: string;
  className?: string;
  /** `sm` = control que abraza el contenido (p. ej. Sexo). */
  size?: SegmentedSize;
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
  const control = (
    <div
      className={segmentedShellClassName({
        size,
        fullWidth,
        className: !label ? className : undefined,
      })}
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
            className={cn(segmentedItemClassName({ size, fullWidth, active }), "cursor-pointer")}
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

export type SegmentedNavItem = {
  href: string;
  label: ReactNode;
  active: boolean;
};

export function SegmentedNav({
  items,
  "aria-label": ariaLabel,
  size = "sm",
  fullWidth = true,
  className,
}: {
  items: SegmentedNavItem[];
  "aria-label": string;
  size?: SegmentedSize;
  fullWidth?: boolean;
  className?: string;
}) {
  return (
    <nav aria-label={ariaLabel} className={className}>
      <div
        className={segmentedShellClassName({ size, fullWidth })}
        role="group"
        aria-label={ariaLabel}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn(segmentedItemClassName({ size, fullWidth, active: item.active }), "no-underline")}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
