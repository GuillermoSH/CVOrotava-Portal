"use client";

import { useTheme } from "next-themes";
import { Toaster as SileoToaster } from "sileo";

import "sileo/styles.css";

/**
 * Host de toasts Sileo (misma convención que Team Manager).
 * Arriba-derecha vía API nativa — evita el dock inferior y barras sticky.
 * Fill/texto en `--sileo-toast-*` (globals.css).
 */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <SileoToaster
      position="top-right"
      theme={theme}
      offset={{
        top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
        right: 12,
      }}
    />
  );
}
