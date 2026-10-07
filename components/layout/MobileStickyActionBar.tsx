"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * Barra de acciones fija en móvil, anclada encima del dock inferior (`MobileNavBottom`).
 * Renderiza en `document.body` para evitar recortes por `overflow` del main.
 */
export function MobileStickyActionBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className={cn("clothing-sticky-bar md:hidden", className)}>{children}</div>,
    document.body,
  );
}
