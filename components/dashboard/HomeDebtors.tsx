import Link from "next/link";

import { buttonClassName } from "@/components/club/Button";
import { appRoutes } from "@/lib/constants";
import type { CriticalDebtor } from "@/lib/payments/dashboard-stats";
import { formatEur } from "@/lib/format/currency";


const LIMIT = 6;

/** Jugadores con algo atrasado (su mes ya terminó), de mayor a menor deuda. */
export function HomeDebtors({ debtors }: Readonly<{ debtors: readonly CriticalDebtor[] }>) {
  const shown = debtors.slice(0, LIMIT);

  return (
    <section className="flex flex-col gap-3" aria-labelledby="debtors-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="debtors-title" className="text-base font-semibold text-foreground">
            A quién reclamar
          </h2>
          <p className="text-sm text-muted-foreground">
            {debtors.length === 0
              ? "Nadie tiene pagos atrasados."
              : `${debtors.length} jugadores con pagos atrasados, de mayor a menor deuda.`}
          </p>
        </div>
        <Link href={appRoutes.payments.reminders} className={buttonClassName({ variant: "secondary", size: "sm" })}>
          Avisos por correo
        </Link>
      </div>

      {shown.length > 0 ? (
        <ul className="flex flex-col">
          {shown.map((d) => (
            <li
              key={d.id}
              className="flex min-h-12 items-center justify-between gap-4 border-t border-[var(--club-border)] py-2 first:border-t-0"
            >
              <Link href={appRoutes.players.detail(d.id)} className="min-w-0 hover:underline">
                <span className="block truncate text-sm font-medium text-foreground">{d.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {d.teamName ?? "Sin equipo"} · {d.lateCount} {d.lateCount === 1 ? "pago atrasado" : "pagos atrasados"}
                </span>
              </Link>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {formatEur(d.balance)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {debtors.length > LIMIT ? (
        <Link href={appRoutes.payments.list} className="text-sm font-medium text-brand hover:underline">
          Ver los {debtors.length} en Pagos
        </Link>
      ) : null}
    </section>
  );
}
