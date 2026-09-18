"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { DashboardChromeProvider } from "@/components/layout/DashboardPage";
import { DASHBOARD_NAVIGATE_EVENT } from "@/lib/layout/navigation-pending";

const STUCK_MS = 8000;
const UNKNOWN_PENDING = "*";
const SKELETON_DELAY_MS = 200;

type DashboardNavigationValue = {
  pathname: string;
  visiblePath: string;
  navigating: boolean;
  showPending: boolean;
};

const DashboardNavigationContext = createContext<DashboardNavigationValue | null>(null);

function isInternalPath(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/parents") ||
    pathname.startsWith("/perfil")
  );
}

export function useDashboardNavigation() {
  const pathname = usePathname();
  const context = useContext(DashboardNavigationContext);
  if (!context) {
    return { pathname, visiblePath: pathname, navigating: false, showPending: false };
  }
  return context;
}

export function DashboardNavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pendingTo, setPendingTo] = useState<string | null>(null);
  const originPathRef = useRef(pathname);

  const [showPending, setShowPending] = useState(false);
  const visiblePath = pendingTo && pendingTo !== UNKNOWN_PENDING ? pendingTo : pathname;
  const navigating = pendingTo !== null && pendingTo !== pathname;

  const startPending = useCallback(
    (nextPath: string | null) => {
      if (nextPath) {
        if (!isInternalPath(nextPath)) return;
        if (nextPath === pathname) {
          setPendingTo(null);
          return;
        }
        originPathRef.current = pathname;
        setPendingTo(nextPath);
        return;
      }
      originPathRef.current = pathname;
      setPendingTo(UNKNOWN_PENDING);
    },
    [pathname],
  );

  useEffect(() => {
    if (pendingTo && pathname !== originPathRef.current) {
      setPendingTo(null);
    }
  }, [pathname, pendingTo]);

  useEffect(() => {
    if (!navigating) {
      setShowPending(false);
      return;
    }
    const timer = window.setTimeout(() => setShowPending(true), SKELETON_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [navigating]);

  useEffect(() => {
    if (!navigating) return;
    const timer = window.setTimeout(() => setPendingTo(null), STUCK_MS);
    return () => window.clearTimeout(timer);
  }, [navigating]);

  useEffect(() => {
    function onNavigateEvent(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail : null;
      startPending(typeof detail === "string" ? detail : null);
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = (event.target as Element | null)?.closest("a[href]");
      if (!(target instanceof HTMLAnchorElement)) return;
      if (target.dataset.noNavPending === "true") return;
      if (target.target && target.target !== "_self") return;
      if (target.hasAttribute("download")) return;

      const url = new URL(target.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === pathname && url.search === window.location.search) {
        setPendingTo(null);
        return;
      }

      startPending(url.pathname);
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener(DASHBOARD_NAVIGATE_EVENT, onNavigateEvent);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(DASHBOARD_NAVIGATE_EVENT, onNavigateEvent);
    };
  }, [pathname, startPending]);

  const value = useMemo(
    () => ({ pathname, visiblePath, navigating, showPending }),
    [pathname, visiblePath, navigating, showPending],
  );

  return (
    <DashboardNavigationContext.Provider value={value}>
      <DashboardChromeProvider>{children}</DashboardChromeProvider>
    </DashboardNavigationContext.Provider>
  );
}
