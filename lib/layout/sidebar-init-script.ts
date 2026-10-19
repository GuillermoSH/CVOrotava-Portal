export const SIDEBAR_COLLAPSED_KEY = "cvo.sidebarCollapsed";

/**
 * Script para el <head> (antes de pintar): vuelca la preferencia guardada en
 * `data-sidebar` del <html>, de modo que `--sidebar-width` es correcto desde el
 * primer frame y no hay salto de layout al hidratar.
 *
 * Vive aparte de `shell-storage.ts` porque el layout (Server Component) lo importa
 * y ese módulo usa hooks de React.
 */
export const sidebarInitScript = `(function(){try{document.documentElement.dataset.sidebar=localStorage.getItem('${SIDEBAR_COLLAPSED_KEY}')==='1'?'collapsed':'expanded'}catch(e){}})();`;
