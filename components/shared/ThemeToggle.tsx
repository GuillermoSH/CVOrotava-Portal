"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  /** Compact = icon only. Expanded = pill with label (login). */
  variant?: "compact" | "expanded";
  className?: string;
  /** @deprecated Use `className`. Kept for call sites that pass custom sizing. */
  triggerClassName?: string;
  /** @deprecated Use `className`. Kept for call sites that pass custom icon sizing. */
  iconClassName?: string;
  /** @deprecated Ignored — toggle is always click-to-cycle. */
  align?: "start" | "center" | "end";
  /** @deprecated Ignored — kept for API compatibility. */
  triggerVariant?: string;
};

export function ThemeToggle({
  variant = "compact",
  className,
  triggerClassName,
  iconClassName,
}: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = resolvedTheme === "light";

  function handleToggle() {
    setTheme(isLight ? "dark" : "light");
  }

  const base = cn(
    "inline-flex cursor-pointer items-center justify-center rounded-xl border transition-all duration-200",
    "border-border bg-card text-muted-foreground",
    "hover:border-[var(--club-border-hover)] hover:bg-[var(--club-surface-hover)] hover:text-foreground",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:cursor-default disabled:opacity-60",
    variant === "compact" ? "size-9" : "gap-2 px-3.5 py-2 text-sm font-medium",
    className,
    triggerClassName,
  );

  const iconSize = variant === "compact" ? "size-4" : "size-3.5";

  if (!mounted) {
    return (
      <button type="button" disabled aria-label="Cargando tema" className={base}>
        <Sun className={cn(iconSize, iconClassName)} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isLight ? "Activar modo oscuro" : "Activar modo claro"}
      title={isLight ? "Modo oscuro" : "Modo claro"}
      className={base}
    >
      {isLight ? (
        <Moon className={cn(iconSize, iconClassName)} />
      ) : (
        <Sun className={cn(iconSize, iconClassName)} />
      )}
      {variant === "expanded" ? (
        <span className="hidden sm:inline">{isLight ? "Oscuro" : "Claro"}</span>
      ) : null}
    </button>
  );
}
