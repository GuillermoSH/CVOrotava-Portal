"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * Barra de acciones fija en móvil, anclada encima del dock inferior (`MobileNavBottom`).
 * Renderiza en `document.body` para evitar recortes por `overflow` del main.
 * Publica su altura real en `--clothing-sticky-bar-measured` para que el scroll
 * reserve exactamente el espacio que ocupa (1 o 2 acciones apiladas).
 */
export function MobileStickyActionBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const root = document.documentElement;
    const publish = () => {
      root.style.setProperty("--clothing-sticky-bar-measured", `${bar.getBoundingClientRect().height}px`);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--clothing-sticky-bar-measured");
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div ref={barRef} className={cn("clothing-sticky-bar md:hidden", className)}>{children}</div>,
    document.body,
  );
}
