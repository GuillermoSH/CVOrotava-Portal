import Link from "next/link";

import { appRoutes } from "@/lib/constants";
import { formatEur } from "@/lib/format/currency";
import type { EconomicControl, OverdueEntry } from "@/lib/payments/economic-control";
import { reveal } from "@/lib/ui/reveal";
import { EmptyState, PlayerLink, plural, rowClass } from "./shared";

function Group({
  title,
  note,
  entries,
  startTurn,
}: Readonly<{ title: string; note: string; entries: OverdueEntry[]; startTurn: number }>) {
  if (entries.length === 0) return null;
  const total = entries.reduce((s, e) => s + e.total, 0);
  return (
    <section className="flex flex-col gap-2">
      <div className="reveal" style={reveal(startTurn)}>
        <h2 className="text-base font-semibold text-foreground">
          {title} · {plural(entries.length, "jugador", "jugadores")} · {formatEur(total)}
        </h2>
        <p className="text-sm text-muted-foreground">{note}</p>
      </div>
      <ul className="flex flex-col">
        {entries.map((e, i) => (
          <li key={e.playerId} className={`reveal ${rowClass}`} style={reveal(startTurn + 1 + i)}>
            <PlayerLink id={e.playerId} name={e.name} teamName={e.teamName} />
            <span className="min-w-0 flex-1 basis-64 text-xs text-muted-foreground">
              {e.concepts.map((c) => `${c.label} (${formatEur(c.remaining)})`).join(" · ")}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatEur(e.total)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function OverdueList({ control }: Readonly<{ control: EconomicControl }>) {
  if (control.overdue.length === 0) return <EmptyState>Nadie tiene pagos vencidos.</EmptyState>;
  const late = control.overdue.filter((e) => e.hasLate);
  const month = control.overdue.filter((e) => !e.hasLate);
  const lateEnd = late.length > 0 ? 1 + late.length : 0;
  return (
    <div className="flex flex-col gap-8">
      <Group
        title="Atrasados"
        note="Algún concepto cuyo mes ya terminó. De mayor a menor deuda."
        entries={late}
        startTurn={0}
      />
      <Group
        title="Vencidos este mes"
        note="Ya pasó el día 10, pero el mes sigue abierto."
        entries={month}
        startTurn={lateEnd}
      />
      <p className="reveal text-xs text-muted-foreground" style={reveal(lateEnd + (month.length > 0 ? 1 + month.length : 0))}>
        Para anotar un cobro, ve a{" "}
        <Link href={appRoutes.payments.list} className="text-brand hover:underline">
          Pagos
        </Link>
        . Los avisos por correo están en{" "}
        <Link href={appRoutes.payments.remindersControl} className="text-brand hover:underline">
          Control de avisos
        </Link>
        .
      </p>
    </div>
  );
}
