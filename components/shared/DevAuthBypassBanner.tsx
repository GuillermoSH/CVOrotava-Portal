import { getDevBypassRole, isDevAuthBypassEnabled } from "@/lib/auth/dev-bypass";

export function DevAuthBypassBanner() {
  if (!isDevAuthBypassEnabled()) {
    return null;
  }

  return (
    <div
      className="border-b border-amber-500/30 bg-amber-500/15 px-4 py-1.5 text-center text-xs font-medium text-amber-900 dark:text-amber-100"
      role="status"
    >
      Modo desarrollo: login desactivado · rol simulado «{getDevBypassRole()}»
    </div>
  );
}
