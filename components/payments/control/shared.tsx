import Link from "next/link";

import { appRoutes } from "@/lib/constants";
import { formatEur } from "@/lib/format/currency";
import type { EconomicControl, PaymentDetail, PaymentRef } from "@/lib/payments/economic-control";
import { cn } from "@/lib/utils";

const dayFormat = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" });
const stampFormat = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Atlantic/Canary",
});

export function day(key: string | null): string {
  if (!key) return "sin fecha";
  const [y, m, d] = key.split("-").map(Number);
  return dayFormat.format(new Date(y, m - 1, d));
}

export function stamp(iso: string): string {
  return stampFormat.format(new Date(iso));
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const METHOD: Record<string, string> = { transferencia: "Transferencia", efectivo: "Efectivo" };

/** `25,00 € · 3 nov 2026 · Transferencia` */
export function paymentLine(p: PaymentRef): string {
  return `${formatEur(p.amount)} · ${paymentWhen(p)}`;
}

/** Fecha y método, sin el importe. */
export function paymentWhen(p: PaymentRef): string {
  return `${day(p.date)}${p.method ? ` · ${METHOD[p.method] ?? p.method}` : ""}`;
}

export function PlayerLink({
  id,
  name,
  teamName,
}: Readonly<{ id: string; name: string; teamName: string | null }>) {
  return (
    <span className="min-w-0">
      <Link
        href={appRoutes.players.detail(id)}
        className="block truncate text-sm font-medium text-foreground hover:underline"
      >
        {name}
      </Link>
      <span className="block truncate text-xs text-muted-foreground">{teamName ?? "Sin equipo"}</span>
    </span>
  );
}

/** Lo que dice la propia fila del cobro: concepto escrito, notas y cuándo se anotó. */
export function PaymentDetailLines({ detail }: Readonly<{ detail: PaymentDetail | undefined }>) {
  if (!detail) return null;
  return (
    <span className="block text-xs text-muted-foreground">
      {detail.concept ? <>Concepto escrito: «{detail.concept}». </> : "Sin concepto escrito. "}
      {detail.notes ? <>Notas: {detail.notes}. </> : null}
      Anotado el {stamp(detail.createdAt)}.
    </span>
  );
}

export const rowClass =
  "flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[var(--club-border)] py-2 first:border-t-0";

export function EmptyState({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <p className="rounded-lg border border-dashed border-[var(--club-border)] px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export type ControlSection = "overview" | "overdue" | "matricula" | "unassigned" | "overpaid";

/** Navegación entre el panel y sus cuatro detalles, con el recuento de cada uno. */
export function ControlSubnav({
  active,
  control,
}: Readonly<{ active: ControlSection; control: EconomicControl }>) {
  const items: { id: ControlSection; label: string; href: string; count?: number }[] = [
    { id: "overview", label: "Panel", href: appRoutes.payments.control },
    { id: "overdue", label: "Vencidos", href: appRoutes.payments.controlOverdue, count: control.overdue.length },
    {
      id: "matricula",
      label: "Matrículas",
      href: appRoutes.payments.controlMatricula,
      count: control.matricula.length,
    },
    {
      id: "unassigned",
      label: "Sin concepto",
      href: appRoutes.payments.controlUnassigned,
      count: control.unassigned.length,
    },
    {
      id: "overpaid",
      label: "Cobrado de más",
      href: appRoutes.payments.controlOverpaid,
      count: control.overpaid.length,
    },
  ];

  return (
    <nav aria-label="Secciones del control económico" className="-mx-1 overflow-x-auto px-1">
      <ul className="flex min-w-max gap-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              aria-current={item.id === active ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm transition-colors",
                item.id === active
                  ? "border-[var(--club-brand)] font-medium text-foreground"
                  : "border-[var(--club-border)] text-muted-foreground hover:bg-[var(--club-surface-hover)] hover:text-foreground",
              )}
            >
              {item.label}
              {item.count ? <span className="text-xs tabular-nums">{item.count}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
