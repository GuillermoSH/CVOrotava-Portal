import type { MonthCollection } from "@/lib/payments/dashboard-stats";
import { monthName, monthShort } from "@/lib/payments/fees";
import { cn } from "@/lib/utils";

const TRACK_HEIGHT = 112;

/**
 * Cuotas cobradas mes a mes, en el calendario de la temporada: cada columna es el total de
 * cuotas de ese mes y la parte rellena, las que ya están al día. Una sola serie, sin leyenda.
 */
export function SeasonMonthChart({
  months,
  currentMonth,
}: Readonly<{ months: readonly MonthCollection[]; currentMonth: number }>) {
  if (months.length === 0) return null;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="month-chart-title">
      <div>
        <h2 id="month-chart-title" className="text-base font-semibold text-foreground">
          Cuotas cobradas por mes
        </h2>
        <p className="text-sm text-muted-foreground">
          Cuotas al día sobre las que tocan cada mes. Vencen el día 10.
        </p>
      </div>

      <ol
        className="grid items-end gap-2"
        style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}
      >
        {months.map((m) => {
          const ratio = m.due > 0 ? m.paid / m.due : 0;
          const isCurrent = m.month === currentMonth;
          const label = `${monthName(m.month)}: ${m.paid} de ${m.due} cuotas al día`;
          return (
            <li key={m.month} className="flex min-w-0 flex-col items-stretch gap-1.5" aria-label={label}>
              <span className="text-center text-xs tabular-nums text-muted-foreground">
                {m.paid}/{m.due}
              </span>
              <div
                className="relative overflow-hidden rounded-md bg-[color-mix(in_srgb,var(--club-brand)_12%,transparent)]"
                style={{ height: TRACK_HEIGHT }}
                role="img"
                aria-label={label}
              >
                <div
                  className="absolute inset-x-0 bottom-0 bg-brand"
                  style={{ height: `${Math.round(ratio * 100)}%` }}
                />
              </div>
              <span
                className={cn(
                  "text-center text-xs capitalize",
                  isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {monthShort(m.month)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
