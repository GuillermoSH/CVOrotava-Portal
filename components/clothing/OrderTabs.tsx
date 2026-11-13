"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type OrderTab = {
  /** También es el ancla de la URL (`#id`): los enlaces de los pasos abren la pestaña. */
  id: string;
  label: string;
  /** Recuento que se ve junto al nombre. */
  count?: number;
  content: ReactNode;
};

/**
 * Pestañas del trabajo del pedido (líneas, entregas previstas, stock). Todas las pestañas están en
 * el DOM, solo se oculta la inactiva, para no perder lo que se esté editando al cambiar.
 */
export function OrderTabs({ tabs, defaultTab }: { tabs: OrderTab[]; defaultTab: string }) {
  const [active, setActive] = useState(defaultTab);
  const listRef = useRef<HTMLDivElement>(null);

  const openFromHash = useCallback(() => {
    const id = window.location.hash.slice(1);
    if (id && tabs.some((tab) => tab.id === id)) setActive(id);
  }, [tabs]);

  useEffect(() => {
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [openFromHash]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = tabs[(index + step + tabs.length) % tabs.length];
    if (!next) return;
    setActive(next.id);
    listRef.current?.querySelector<HTMLButtonElement>(`#tab-${next.id}`)?.focus();
  }

  return (
    <div className="ord-tabs">
      <div ref={listRef} role="tablist" aria-label="Trabajo del pedido" className="ord-tabs__list">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={tab.id}
            tabIndex={active === tab.id ? 0 : -1}
            className="ord-tab"
            onClick={() => setActive(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {tab.label}
            {tab.count !== undefined ? <span className="ord-tab__count">{tab.count}</span> : null}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={tab.id}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={active !== tab.id}
          className="ord-tabpanel"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
