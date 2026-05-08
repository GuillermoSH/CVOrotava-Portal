"use client";

import { Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { appRoutes } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SidebarNav({
  collapsed = false,
  variant = "sidebar",
}: {
  collapsed?: boolean;
  variant?: "sidebar" | "dock";
}) {
  const pathname = usePathname();
  const isAdminSection = pathname.startsWith(appRoutes.admin);
  const homeActive = pathname === appRoutes.home;
  const paymentsActive =
    pathname === appRoutes.adminPayments || pathname === appRoutes.adminPaymentsHibrido;
  const configActive = pathname === appRoutes.adminPaymentsConfig;
  const generateActive = pathname === appRoutes.adminPaymentsGenerate;
  const planningActive = pathname === appRoutes.adminPaymentsPlanning;

  if (variant === "dock") {
    return (
      <ul className="flex flex-row items-center justify-center gap-2">
        <li className="shrink-0">
          <Link
            href={appRoutes.home}
            className={cn(
              "inline-flex min-w-[5.5rem] flex-col items-center justify-center gap-0.5 rounded-lg border border-transparent px-4 py-1.5 text-xs transition-colors",
              "hover:border-border hover:bg-muted/50",
              homeActive ? "border-border bg-muted/60 font-medium text-foreground" : "text-muted-foreground",
            )}
            aria-current={homeActive ? "page" : undefined}
          >
            <Home className="size-5 shrink-0" aria-hidden />
            <span>Inicio</span>
          </Link>
        </li>
        {isAdminSection ? (
          <>
            <li className="shrink-0">
              <Link
                href={appRoutes.adminPayments}
                className={cn(
                  "inline-flex min-w-[5.5rem] flex-col items-center justify-center gap-0.5 rounded-lg border border-transparent px-4 py-1.5 text-xs transition-colors",
                  "hover:border-border hover:bg-muted/50",
                  paymentsActive
                    ? "border-border bg-muted/60 font-medium text-foreground"
                    : "text-muted-foreground",
                )}
                aria-current={paymentsActive ? "page" : undefined}
              >
                <span>PAGOS</span>
              </Link>
            </li>
          </>
        ) : null}
      </ul>
    );
  }

  return (
    <nav aria-label="Principal" className={cn("mt-4", collapsed && "mt-2")}>
      <ul className="space-y-1">
        <li>
          <Link
            href={appRoutes.home}
            title={collapsed ? "Inicio" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md py-1.5 text-sm transition-colors",
              collapsed ? "justify-center px-0" : "px-2",
              homeActive
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Home className="size-4 shrink-0" aria-hidden />
            {collapsed ? (
              <span className="sr-only">Inicio</span>
            ) : (
              <span>Inicio</span>
            )}
          </Link>
        </li>
        {isAdminSection ? (
          <>
            <li className={cn("pt-2", collapsed && "pt-1")}>
              {collapsed ? (
                <span className="sr-only">Demos de pagos</span>
              ) : (
                <p className="px-2 text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                  Pagos
                </p>
              )}
            </li>
            <li>
              <Link
                href={appRoutes.adminPayments}
                title={collapsed ? "Pagos" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md py-1.5 text-sm transition-colors",
                  collapsed ? "justify-center px-0" : "px-2",
                  paymentsActive
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
                aria-current={paymentsActive ? "page" : undefined}
              >
                {collapsed ? <span className="font-medium">PG</span> : <span>Pagos</span>}
              </Link>
            </li>
            <li className={cn(collapsed ? "hidden" : "pt-2")}>
              <p className="px-2 text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                Planificación PC
              </p>
            </li>
            <li className={collapsed ? "hidden" : undefined}>
              <Link
                href={appRoutes.adminPaymentsConfig}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  configActive
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
                aria-current={configActive ? "page" : undefined}
              >
                <span>Configurar grupos</span>
              </Link>
            </li>
            <li className={collapsed ? "hidden" : undefined}>
              <Link
                href={appRoutes.adminPaymentsGenerate}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  generateActive
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
                aria-current={generateActive ? "page" : undefined}
              >
                <span>Generar temporada</span>
              </Link>
            </li>
            <li className={collapsed ? "hidden" : undefined}>
              <Link
                href={appRoutes.adminPaymentsPlanning}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  planningActive
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
                aria-current={planningActive ? "page" : undefined}
              >
                <span>Revisar planificación</span>
              </Link>
            </li>
          </>
        ) : null}
      </ul>
    </nav>
  );
}
