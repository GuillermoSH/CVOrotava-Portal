import Link from "next/link";

import { appRoutes } from "@/lib/constants";
import { formatEur } from "@/lib/format/currency";
import type { EconomicControl } from "@/lib/payments/economic-control";
import { reveal } from "@/lib/ui/reveal";
import { EmptyState, PlayerLink, plural, rowClass } from "./shared";

export function MatriculaList({ control }: Readonly<{ control: EconomicControl }>) {
  if (control.matricula.length === 0) return <EmptyState>Todas las matrículas están cobradas.</EmptyState>;
  return (
    <div className="flex flex-col gap-4">
      <p className="reveal text-sm text-muted-foreground" style={reveal(0)}>
        {plural(control.matricula.length, "jugador", "jugadores")} sin la matrícula cobrada, {formatEur(control.matriculaTotal)} en
        total.
      </p>
      <ul className="flex flex-col">
        {control.matricula.map((e, i) => (
          <li key={e.playerId} className={`reveal ${rowClass}`} style={reveal(1 + i)}>
            <PlayerLink id={e.playerId} name={e.name} teamName={e.teamName} />
            <span className="shrink-0 text-right">
              <span className="block text-sm font-semibold tabular-nums text-foreground">{formatEur(e.amount)}</span>
              {e.paidSoFar > 0 ? (
                <span className="block text-xs text-muted-foreground">Ya pagó {formatEur(e.paidSoFar)}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      <p className="reveal text-xs text-muted-foreground" style={reveal(2 + control.matricula.length)}>
        Para anotar un cobro, ve a{" "}
        <Link href={appRoutes.payments.list} className="text-brand hover:underline">
          Pagos
        </Link>
        .
      </p>
    </div>
  );
}
