import { Suspense, type ReactNode } from "react";

import { DashboardBodySkeleton } from "@/components/shared/skeletons";
import type { DashboardSkeletonKind } from "@/lib/layout/dashboard-route-chrome";

/**
 * Envuelve el cuerpo async de una page (cookies / searchParams / fetch)
 * para Cache Components. El layout de auth no debe envolver `{children}`
 * tras await — ver `.cursor/rules/cache-components-nav.mdc`.
 */
export function RuntimePage({
  children,
  kind = "players",
}: {
  children: ReactNode;
  kind?: DashboardSkeletonKind;
}) {
  return (
    <Suspense fallback={<DashboardBodySkeleton kind={kind} />}>
      {children}
    </Suspense>
  );
}
