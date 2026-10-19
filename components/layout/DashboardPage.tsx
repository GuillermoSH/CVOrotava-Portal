"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DashboardChromeOverride = {
  title?: string;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  /** `null` oculta la acción de la ruta; `undefined` deja la del mapa. */
  actions?: ReactNode | null;
  /** Controles en la fila superior, a la derecha del enlace «volver». */
  topActions?: ReactNode;
};

type DashboardChromeContextValue = {
  override: DashboardChromeOverride | null;
  setOverride: (next: DashboardChromeOverride | null) => void;
};

const DashboardChromeContext = createContext<DashboardChromeContextValue | null>(null);

export function DashboardChromeProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<DashboardChromeOverride | null>(null);
  const value = useMemo(() => ({ override, setOverride }), [override]);
  return <DashboardChromeContext.Provider value={value}>{children}</DashboardChromeContext.Provider>;
}

export function useDashboardChromeOverride() {
  return useContext(DashboardChromeContext);
}

/**
 * Cuerpo de una página del dashboard. El título vive en el shell (no se desmonta
 * al navegar). Usa las props solo cuando el cromado depende de datos cargados.
 */
export function DashboardPage({
  title,
  subtitle,
  back,
  actions,
  topActions,
  className,
  children,
}: DashboardChromeOverride & {
  className?: string;
  children: ReactNode;
}) {
  const setOverride = useDashboardChromeOverride()?.setOverride;

  useLayoutEffect(() => {
    if (!setOverride) return;
    setOverride({ title, subtitle, back, actions, topActions });
    return () => setOverride(null);
  }, [setOverride, title, subtitle, back, actions, topActions]);

  if (className) {
    return <div className={className}>{children}</div>;
  }
  return <>{children}</>;
}
