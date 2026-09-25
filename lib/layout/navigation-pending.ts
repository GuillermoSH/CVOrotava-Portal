export const DASHBOARD_NAVIGATE_EVENT = "cvo-dashboard-navigate";

/** Marca navegación pendiente (p. ej. `router.push`) para actualizar el nav al instante. */
export function markDashboardNavigating(pathname?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DASHBOARD_NAVIGATE_EVENT, { detail: pathname ?? null }));
}
