"use client";

import { useCallback, useSyncExternalStore } from "react";

import { SIDEBAR_COLLAPSED_KEY } from "@/lib/layout/sidebar-init-script";

const CHANGE_EVENT = "cvo:sidebar-collapsed";

export function readSidebarCollapsed(): boolean {
  return document.documentElement.dataset.sidebar === "collapsed";
}

export function writeSidebarCollapsed(collapsed: boolean) {
  document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* almacenamiento bloqueado: el estado dura lo que la pestaña */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

export function useSidebarCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(subscribe, readSidebarCollapsed, () => false);
  const toggle = useCallback(() => writeSidebarCollapsed(!readSidebarCollapsed()), []);
  return [collapsed, toggle];
}
