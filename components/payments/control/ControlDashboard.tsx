import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { HomeDebtors } from "@/components/dashboard/HomeDebtors";
import { HomeRecentPayments } from "@/components/dashboard/HomeRecentPayments";
import { SeasonMonthChart } from "@/components/dashboard/SeasonMonthChart";
import { appRoutes } from "@/lib/constants";
import { formatEur } from "@/lib/format/currency";
import type { PaymentsDashboard } from "@/lib/payments/dashboard-stats";
import type { EconomicControl } from "@/lib/payments/economic-control";
import { reveal } from "@/lib/ui/reveal";
import { plural } from "./shared";

const pct = new Intl.NumberFormat("es-ES", { style: "percent", maximumFractionDigits: 0 });

function Cell({
  label,
  value,
  caption,
  ratio,
  turn,
}: Readonly<{ label: string; value: string; caption: string; ratio?: number; turn: number }>) {
  return (
    <div className="reveal flex min-w-0 flex-col gap-1 px-5 py-4" style={reveal(turn)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      {ratio != null ? (
        <div
          className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--club-brand)_14%,transparent)]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(ratio * 100)}
          aria-label="Cobrado sobre lo previsto"
        >
          <div
            className="reveal-grow-x h-full rounded-full bg-brand"
            style={{ width: `${Math.min(100, ratio * 100)}%`, ...reveal(turn + 2) }}
          />
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}

function ReviewLink({
  href,
  label,
  detail,
  value,
  turn,
}: Readonly<{ href: string; label: string; detail: string; value: string; turn: number }>) {
  return (
    <li className="reveal border-t border-[var(--club-border)] first:border-t-0" style={reveal(turn)}>
      <Link
        href={href}
        className="group -mx-2 flex min-h-12 items-center justify-between gap-4 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--club-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium text-foreground">{label}</span>
          <span className="block text-xs text-muted-foreground">{detail}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
          <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </Link>
    </li>
  );
}

/** Panel de control económico: cifras de la temporada, qué revisar y entrada a cada detalle. */
export function ControlDashboard({
  payments,
  control,
  currentMonth,
}: Readonly<{ payments: PaymentsDashboard; control: EconomicControl; currentMonth: number }>) {
  const paid = payments.expectedTotal > 0 ? payments.onTariffTotal / payments.expectedTotal : 0;
  const toReview = control.unassigned.length + control.overpaid.length;

  return (
    <div className="flex flex-col gap-8">
      <div
        className="grid grid-cols-2 divide-[var(--club-border)] rounded-xl border border-[var(--club-border)] bg-[var(--club-surface)] max-lg:divide-y lg:grid-cols-4 lg:divide-x"
        role="group"
        aria-label="Indicadores económicos"
      >
        <Cell
          turn={0}
          label="Cobrado esta temporada"
          value={formatEur(payments.seasonTotal)}
          caption={
            payments.expectedTotal > 0
              ? `${pct.format(paid)} de ${formatEur(payments.expectedTotal)} previstos`
              : "Sin tarifa prevista todavía"
          }
          ratio={payments.expectedTotal > 0 ? paid : undefined}
        />
        <Cell
          turn={1}
          label="Vencido sin cobrar"
          value={formatEur(control.overdueTotal)}
          caption={`${plural(control.overdue.length, "jugador", "jugadores")} · ${control.overdueLate} con atrasos`}
        />
        <Cell
          turn={2}
          label="Matrícula pendiente"
          value={formatEur(control.matriculaTotal)}
          caption={plural(control.matricula.length, "jugador", "jugadores")}
        />
        <Cell
          turn={3}
          label="Cobrado este mes"
          value={formatEur(payments.monthTotal)}
          caption={
            payments.monthly
              ? `${payments.monthly.paid} de ${payments.monthly.target} cuotas del mes al día`
              : "Sin cuotas este mes"
          }
        />
      </div>

      <div className="grid gap-x-10 gap-y-8 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          <section className="flex flex-col gap-3" aria-labelledby="review-title">
            <div className="reveal" style={reveal(4)}>
              <h2 id="review-title" className="text-base font-semibold text-foreground">
                Qué revisar
              </h2>
              <p className="text-sm text-muted-foreground">
                {toReview > 0
                  ? "Cobros que no cuadran con la tarifa: conviene limpiarlos para que las cifras sean fiables."
                  : "Los cobros cuadran con la tarifa."}
              </p>
            </div>
            <ul className="flex flex-col">
              <ReviewLink
                turn={5}
                href={appRoutes.payments.controlOverdue}
                label="Vencidos sin cobrar"
                detail={`${formatEur(control.overdueTotal)} · atrasados primero`}
                value={plural(control.overdue.length, "jugador", "jugadores")}
              />
              <ReviewLink
                turn={6}
                href={appRoutes.payments.controlMatricula}
                label="Matrículas pendientes"
                detail={formatEur(control.matriculaTotal)}
                value={plural(control.matricula.length, "jugador", "jugadores")}
              />
              <ReviewLink
                turn={7}
                href={appRoutes.payments.controlUnassigned}
                label="Cobros sin concepto"
                detail={`${formatEur(control.unassignedTotal)} · no suman en lo cobrado`}
                value={String(control.unassigned.length)}
              />
              <ReviewLink
                turn={8}
                href={appRoutes.payments.controlOverpaid}
                label="Cobrado de más"
                detail="Duplicados e importes por encima de la tarifa"
                value={formatEur(control.overpaidTotal)}
              />
            </ul>
          </section>

          <SeasonMonthChart months={payments.byMonth} currentMonth={currentMonth} startTurn={9} />
          <HomeDebtors debtors={payments.debtors} startTurn={10 + payments.byMonth.length} />
        </div>
        <aside className="flex flex-col gap-8">
          <HomeRecentPayments payments={payments.recent} startTurn={4} />
        </aside>
      </div>
    </div>
  );
}
