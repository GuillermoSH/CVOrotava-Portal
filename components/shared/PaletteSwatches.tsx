"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import { clubPaletteDark, clubPaletteLight } from "@/lib/constants";

const SWATCHES = [
  { label: "Fondo", token: "bg-club-bg", key: "bg" as const },
  { label: "Superficie", token: "bg-club-surface", key: "surface" as const },
  { label: "Marca", token: "bg-brand", key: "brand" as const },
  { label: "Texto", token: "bg-club-fg", key: "fg" as const },
] as const;

export function PaletteSwatches() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const palette =
    mounted && resolvedTheme === "light"
      ? clubPaletteLight
      : clubPaletteDark;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {SWATCHES.map((s) => (
        <div
          key={s.label}
          className="overflow-hidden rounded-xl border border-border bg-card ring-1 ring-foreground/10"
        >
          <div className={`h-16 ${s.token}`} />
          <div className="space-y-1 px-3 py-2">
            <p className="text-xs font-medium text-foreground">{s.label}</p>
            <p className="font-mono text-[10px] text-muted-foreground">
              {palette[s.key]}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
