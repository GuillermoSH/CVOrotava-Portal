"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { useDashboardNavigation } from "@/components/layout/DashboardNavigation";
import { useDashboardChromeOverride } from "@/components/layout/DashboardPage";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardBodySkeleton } from "@/components/shared/skeletons";
import {
  getDashboardFrameClassName,
  getDashboardRouteChrome,
} from "@/lib/layout/dashboard-route-chrome";

export function DashboardMain({ children }: { children: React.ReactNode }) {
  const { pathname, visiblePath, navigating, showPending } = useDashboardNavigation();
  const override = useDashboardChromeOverride()?.override ?? null;
  const mainRef = useRef<HTMLElement>(null);

  const chromePath = showPending ? visiblePath : pathname;
  const routeChrome = getDashboardRouteChrome(chromePath);
  const activeOverride = showPending ? null : override;

  const title = activeOverride?.title ?? routeChrome?.title;
  const subtitle = activeOverride?.subtitle ?? routeChrome?.subtitle;
  const back = activeOverride?.back ?? routeChrome?.back;
  const actions =
    activeOverride && activeOverride.actions !== undefined
      ? activeOverride.actions
      : routeChrome?.action ? (
          <div className="clothing-toolbar hidden md:flex">
            <Link href={routeChrome.action.href} className="btn-primary">
              {routeChrome.action.label}
            </Link>
          </div>
        ) : undefined;

  useEffect(() => {
    if (!showPending) return;
    mainRef.current?.scrollTo({ top: 0 });
  }, [showPending, visiblePath]);

  return (
    <>
      {navigating ? (
        <div className="nav-progress" aria-hidden>
          <span className="nav-progress__bar" />
        </div>
      ) : null}
      <main
        ref={mainRef}
        className="scrollbar-hidden flex-1 overflow-auto px-4 py-4 pb-[calc(4rem+max(0.5rem,env(safe-area-inset-bottom,0px)))] md:px-6 lg:py-6"
        aria-busy={navigating}
      >
        <div className={getDashboardFrameClassName(routeChrome)}>
          {title ? (
            <PageHeader title={title} subtitle={subtitle} back={back} actions={actions} />
          ) : null}
          {showPending ? (
            <DashboardBodySkeleton kind={routeChrome?.skeleton} action={routeChrome?.action} />
          ) : (
            children
          )}
        </div>
      </main>
    </>
  );
}
