"use client";

import { useTheme } from "next-themes";
import { Toaster as SileoToaster } from "sileo";

import "sileo/styles.css";

/**
 * Host de toasts Sileo (misma convención que Team Manager).
 * `theme` sigue el tema de la página; fill/texto en `--sileo-toast-*` en globals.css.
 */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  return <SileoToaster position="top-right" theme={theme} />;
}