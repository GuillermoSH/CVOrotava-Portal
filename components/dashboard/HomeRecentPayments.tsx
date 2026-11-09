import Link from "next/link";

import { buttonClassName } from "@/components/club/Button";
import { appRoutes } from "@/lib/constants";
import type { RecentPayment } from "@/lib/payments/dashboard-stats";
import { formatEur } from "@/lib/format/currency";
import { reveal } from "@/lib/ui/reveal";

const day = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });

/** Últimos cobros anotados: columna lateral, 5 filas y salida a Pagos (sin paginación). */
export function HomeRecentPayments({
  payments,
  startTurn = 0,
}: Readonly<{ payments: readonly RecentPayment[]; startTurn?: number }>) {
  const shown = payments.slice(0, 5);

  return (
    <section className="flex flex-col gap-3" aria-labelledby="recent-title">
      <h2 id="recent-title" className="reveal text-base font-semibold text-foreground" style={reveal(startTurn)}>
        Últimos cobros
      </h2>

      {shown.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--club-border)] px-4 py-6 text-center text-sm text-muted-foreground">
          Todavía no hay cobros anotados esta temporada.
        </p>
      ) : (
        <ul className="flex flex-col">
          {shown.map((p, i) => (
            <li
              key={p.id}
              style={reveal(startTurn + 1 + i)}
              className="reveal flex min-h-12 items-center justify-between gap-3 border-t border-[var(--club-border)] py-2 first:border-t-0"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">{p.playerName}</span>
                <span className="block truncate text-xs text-muted-foreground">{p.concept}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold tabular-nums text-foreground">
                  {formatEur(p.amount)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {day.format(new Date(`${p.date}T00:00:00`))}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={appRoutes.payments.list}
        className={buttonClassName({ variant: "secondary", size: "sm", className: "reveal w-fit" })}
        style={reveal(startTurn + 1 + shown.length)}
      >
        Ver todos los pagos
      </Link>
    </section>
  );
}
