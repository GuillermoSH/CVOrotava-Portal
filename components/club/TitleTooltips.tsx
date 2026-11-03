"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

const SHOW_DELAY_MS = 280;

type Active = { el: HTMLElement; label: string };

/**
 * Sustituye el tooltip nativo del navegador (atributo `title`) por el del club en toda la app,
 * sin tocar cada botón: al pasar el ratón o enfocar con teclado, el `title` se retira un momento
 * (para que el navegador no pinte el suyo) y se muestra nuestra burbuja; al salir se restaura.
 *
 * Nunca aparece en pantallas táctiles: sin hover no hay tooltip, y un toque no lo dispara.
 */
export function TitleTooltips() {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<Active | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<Active | null>(null);
  const timer = useRef<number>(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // Sin hover (táctil) no se instala nada: el `title` se queda como está.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const restore = () => {
      window.clearTimeout(timer.current);
      const current = activeRef.current;
      if (current) {
        current.el.setAttribute("title", current.label);
        activeRef.current = null;
      }
      setActive(null);
      setPos(null);
    };

    // El `title` se retira ya al entrar para que el navegador no llegue a pintar el suyo.
    const begin = (el: HTMLElement) => {
      const label = el.getAttribute("title")?.trim();
      if (!label) return;
      if (activeRef.current?.el === el) return;
      restore();
      el.removeAttribute("title");
      activeRef.current = { el, label };
      timer.current = window.setTimeout(() => {
        if (activeRef.current?.el === el) setActive({ el, label });
      }, SHOW_DELAY_MS);
    };

    const onOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const target = (event.target as Element | null)?.closest<HTMLElement>("[title]");
      if (target) begin(target);
    };
    const onOut = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const current = activeRef.current;
      if (!current) return;
      const next = event.relatedTarget as Node | null;
      if (next && current.el.contains(next)) return;
      restore();
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      // Solo foco de teclado: un clic o un toque no deben abrirlo.
      if (!target?.matches?.(":focus-visible")) return;
      const el = target.closest<HTMLElement>("[title]");
      if (el) begin(el);
    };
    const onFocusOut = () => restore();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") restore();
    };

    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerout", onOut, true);
    document.addEventListener("pointerdown", restore, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", restore, true);
    return () => {
      restore();
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("pointerout", onOut, true);
      document.removeEventListener("pointerdown", restore, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", restore, true);
    };
  }, []);

  useLayoutEffect(() => {
    if (!active || !tipRef.current) return;
    const rect = active.el.getBoundingClientRect();
    const tip = tipRef.current.getBoundingClientRect();
    const gap = 8;
    const pad = 8;
    let top = rect.top - tip.height - gap;
    if (top < pad) top = rect.bottom + gap;
    const left = Math.min(
      Math.max(pad, rect.left + rect.width / 2 - tip.width / 2),
      window.innerWidth - tip.width - pad,
    );
    setPos({ top, left });
  }, [active]);

  if (!mounted || !active) return null;
  return createPortal(
    <div
      ref={tipRef}
      role="tooltip"
      style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: "hidden" }}
      className={cn(
        "pointer-events-none fixed z-[110] max-w-xs rounded-lg border border-border",
        "bg-[var(--club-drawer-bg)] px-2 py-1 text-xs font-medium text-foreground shadow-lg",
      )}
    >
      {active.label}
    </div>,
    document.body,
  );
}
