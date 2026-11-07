import Link from "next/link";

import { AnnulPaymentButton } from "@/components/payments/AnnulPaymentButton";
import { appRoutes } from "@/lib/constants";
import { formatEur } from "@/lib/format/currency";
import type { EconomicControl, PaymentRef } from "@/lib/payments/economic-control";

const dayFormat = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" });

function day(key: string | null): string {
  if (!key) return "sin fecha";
  const [y, m, d] = key.split("-").map(Number);
  return dayFormat.format(new Date(y, m - 1, d));
}

const METHOD: Record<string, string> = { transferencia: "Transferencia", efectivo: "Efectivo" };

function paymentLine(p: PaymentRef): string {
  return `${formatEur(p.amount)} · ${day(p.date)}${p.method ? ` · ${METHOD[p.method] ?? p.method}` : ""}`;
}

function PlayerLink({ id, name, teamName }: Readonly<{ id: string; name: string; teamName: string | null }>) {
  return (
    <span className="min-w-0">
      <Link href={appRoutes.players.detail(id)} className="block truncate text-sm font-medium text-foreground hover:underline">
        {name}
      </Link>
      <span className="block truncate text-xs text-muted-foreground">{teamName ?? "Sin equipo"}</span>
    </span>
  );
}

function Section({
  id,
  title,
  summary,
  empty,
  isEmpty,
  children,
}: Readonly<{
  id: string;
  title: string;
  summary: string;
  empty: string;
  isEmpty: boolean;
  children: React.ReactNode;
}>) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-3" aria-labelledby={`${id}-title`}>
      <div>
        <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{isEmpty ? empty : summary}</p>
      </div>
      {isEmpty ? null : children}
    </section>
  );
}

const rowClass =
  "flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[var(--club-border)] py-2 first:border-t-0";

function Stat({ label, value, caption, href }: Readonly<{ label: string; value: string; caption: string; href: string }>) {
  return (
    <a href={href} className="flex min-w-0 flex-col gap-0.5 px-5 py-4 transition-colors hover:bg-[var(--club-surface-hover)]">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{caption}</span>
    </a>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function EconomicControlView({ control }: Readonly<{ control: EconomicControl }>) {
  const { overdue, matricula, unassigned, overpaid } = control;

  return (
    <div className="flex flex-col gap-8">
      <div
        className="grid grid-cols-2 divide-[var(--club-border)] overflow-hidden rounded-xl border border-[var(--club-border)] bg-[var(--club-surface)] max-lg:divide-y lg:grid-cols-4 lg:divide-x"
        role="group"
        aria-label="Resumen del control económico"
      >
        <Stat
          label="Vencido sin cobrar"
          value={formatEur(control.overdueTotal)}
          caption={plural(overdue.length, "jugador", "jugadores")}
          href="#vencidos"
        />
        <Stat
          label="Matrícula pendiente"
          value={formatEur(control.matriculaTotal)}
          caption={plural(matricula.length, "jugador", "jugadores")}
          href="#matricula"
        />
        <Stat
          label="Cobros sin concepto"
          value={formatEur(control.unassignedTotal)}
          caption={`${plural(unassigned.length, "cobro", "cobros")} · no suman`}
          href="#sin-concepto"
        />
        <Stat
          label="Cobrado de más"
          value={formatEur(control.overpaidTotal)}
          caption={plural(overpaid.length, "concepto", "conceptos")}
          href="#cobrado-de-mas"
        />
      </div>

      <Section
        id="vencidos"
        title="Vencidos sin cobrar"
        summary={`${plural(overdue.length, "jugador debe", "jugadores deben")} ${formatEur(control.overdueTotal)}. Los atrasados (mes ya terminado) van primero.`}
        empty="Nadie tiene pagos vencidos."
        isEmpty={overdue.length === 0}
      >
        <ul className="flex flex-col">
          {overdue.map((e) => (
            <li key={e.playerId} className={rowClass}>
              <PlayerLink id={e.playerId} name={e.name} teamName={e.teamName} />
              <span className="min-w-0 flex-1 basis-64 text-xs text-muted-foreground">
                {e.concepts.map((c) => `${c.label} (${formatEur(c.remaining)})`).join(" · ")}
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold tabular-nums text-foreground">{formatEur(e.total)}</span>
                {e.hasLate ? <span className="block text-xs text-foreground">Atrasado</span> : null}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Para anotar el cobro, ve a <Link href={appRoutes.payments.list} className="text-brand hover:underline">Pagos</Link>;
          el seguimiento de los avisos está en{" "}
          <Link href={appRoutes.payments.remindersControl} className="text-brand hover:underline">Control de avisos</Link>.
        </p>
      </Section>

      <Section
        id="matricula"
        title="Matrícula pendiente"
        summary={`${plural(matricula.length, "jugador sin", "jugadores sin")} la matrícula cobrada, ${formatEur(control.matriculaTotal)} en total.`}
        empty="Todas las matrículas están cobradas."
        isEmpty={matricula.length === 0}
      >
        <ul className="flex flex-col">
          {matricula.map((e) => (
            <li key={e.playerId} className={rowClass}>
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
      </Section>

      <Section
        id="sin-concepto"
        title="Cobros sin concepto asignado"
        summary={`${plural(unassigned.length, "cobro", "cobros")} (${formatEur(control.unassignedTotal)}) que no cierran ninguna línea de tarifa. ${
          control.unassignedWithTwin > 0
            ? `${plural(control.unassignedWithTwin, "tiene", "tienen")} un cobro con concepto del mismo importe: probable repetición, comprueba el banco antes de anular.`
            : "Ninguno tiene un cobro gemelo."
        }`}
        empty="No hay cobros sin concepto."
        isEmpty={unassigned.length === 0}
      >
        <ul className="flex flex-col">
          {unassigned.map((e) => (
            <li key={e.payment.id} className={rowClass}>
              <PlayerLink id={e.playerId} name={e.name} teamName={e.teamName} />
              <span className="min-w-0 flex-1 basis-64 text-xs text-muted-foreground">
                {paymentLine(e.payment)}
                {e.twin ? (
                  <span className="block text-foreground">
                    Repite: {e.twin.concept} · {day(e.twin.date)}
                  </span>
                ) : null}
              </span>
              <AnnulPaymentButton paymentId={e.payment.id} />
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="cobrado-de-mas"
        title="Cobrado de más"
        summary={`${formatEur(control.overpaidTotal)} por encima de la tarifa en ${plural(overpaid.length, "concepto", "conceptos")}: lo normal es un cobro anotado dos veces.`}
        empty="Nada cobrado por encima de la tarifa."
        isEmpty={overpaid.length === 0}
      >
        <ul className="flex flex-col">
          {overpaid.map((e) => (
            <li key={`${e.playerId}-${e.concept}`} className="flex flex-col gap-2 border-t border-[var(--club-border)] py-3 first:border-t-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <PlayerLink id={e.playerId} name={e.name} teamName={e.teamName} />
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums text-foreground">+{formatEur(e.excess)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {e.concept}: {formatEur(e.paid)} de {formatEur(e.due)}
                  </span>
                </span>
              </div>
              <ul className="flex flex-col gap-1.5 pl-3">
                {e.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{paymentLine(p)}</span>
                    <AnnulPaymentButton paymentId={p.id} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
