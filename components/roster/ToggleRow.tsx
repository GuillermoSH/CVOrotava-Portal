import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
  step,
  compact,
  trailing,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  step?: number;
  compact?: boolean;
  /** Contenido a la derecha del título/subtítulo (antes del switch). */
  trailing?: ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2.5 rounded-xl border border-[var(--club-border)]",
        compact ? "min-h-10 px-3 py-2" : "min-h-11 px-3 py-2.5 md:px-4",
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2.5">
        {step != null ? (
          <span
            aria-hidden
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
              checked
                ? "bg-success/15 text-success"
                : "bg-[var(--club-surface-2)] text-muted-foreground",
            )}
          >
            {step}
          </span>
        ) : null}
        <span className="min-w-0">
          <span id={`${id}-label`} className="block text-sm font-medium text-foreground">
            {label}
          </span>
          {hint ? (
            <span id={hintId} className="mt-0.5 block text-xs text-muted-foreground">
              {hint}
            </span>
          ) : null}
        </span>
      </span>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
      <button
        id={id}
        type="button"
        role="switch"
        aria-labelledby={`${id}-label`}
        aria-checked={checked}
        aria-describedby={hintId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-brand" : "bg-[var(--club-surface-2)] ring-1 ring-inset ring-[var(--club-border)]",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-0.5 left-0.5 size-6 rounded-full bg-[var(--club-drawer-bg)] shadow-[0_1px_3px_rgba(16,16,24,0.28)] transition-transform duration-200 ease-out",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}

export function SectionHeading({
  icon: Icon,
  title,
  action,
}: {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--club-surface-2)] text-muted-foreground"
        >
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
        <h2 className="section-title">{title}</h2>
      </div>
      {action}
    </div>
  );
}
