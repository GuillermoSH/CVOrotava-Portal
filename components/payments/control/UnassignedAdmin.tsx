import { Badge } from "@/components/club/Badge";
import { AnnulPaymentButton } from "@/components/payments/AnnulPaymentButton";
import { AssignPaymentButton } from "@/components/payments/AssignPaymentButton";
import { formatEur } from "@/lib/format/currency";
import type { EconomicControl, PaymentDetail, UnassignedEntry } from "@/lib/payments/economic-control";
import { reveal } from "@/lib/ui/reveal";
import { EmptyState, PaymentDetailLines, PlayerLink, day, paymentWhen, plural } from "./shared";

const GROUPS: { verdict: UnassignedEntry["verdict"]; title: string; note: string }[] = [
  {
    verdict: "repeat",
    title: "Probables repeticiones",
    note: "El mismo jugador tiene otro cobro con el mismo importe (con concepto, o libre el mismo día). Comprueba el banco y anula el que sobre.",
  },
  {
    verdict: "assign",
    title: "Se pueden asignar a una deuda abierta",
    note: "No repiten nada y su importe coincide con lo que falta de un concepto: asignarlo lo suma a lo cobrado.",
  },
  {
    verdict: "review",
    title: "Sin pista: revisar a mano",
    note: "Ni repiten otro cobro ni encajan con una deuda abierta. Mira concepto, notas y fecha antes de decidir.",
  },
];

function Entry({
  e,
  detail,
  turn,
}: Readonly<{ e: UnassignedEntry; detail: PaymentDetail | undefined; turn: number }>) {
  return (
    <li style={reveal(turn)} className="reveal flex flex-col gap-2 border-t border-[var(--club-border)] py-3 first:border-t-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PlayerLink id={e.playerId} name={e.name} teamName={e.teamName} />
        <span className="shrink-0 text-right">
          <span className="block text-sm font-semibold tabular-nums text-foreground">{formatEur(e.payment.amount)}</span>
          <span className="block text-xs text-muted-foreground">{paymentWhen(e.payment)}</span>
        </span>
      </div>
      <PaymentDetailLines detail={detail} />
      {e.twins.length > 0 ? (
        <ul className="flex flex-col gap-0.5 text-xs text-foreground">
          {e.twins.map((t) => (
            <li key={t.id}>
              Mismo importe que «{t.concept}» del {day(t.date)}
            </li>
          ))}
        </ul>
      ) : null}
      {e.repeatsFree ? (
        <p className="text-xs text-foreground">Hay otro cobro libre del mismo importe el mismo día.</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {e.assignTargets.map((t) => (
          <AssignPaymentButton
            key={`${t.code}-${t.month}`}
            paymentId={e.payment.id}
            code={t.code}
            month={t.month}
            label={t.label}
          />
        ))}
        <AnnulPaymentButton paymentId={e.payment.id} />
      </div>
    </li>
  );
}

export function UnassignedAdmin({
  control,
  details,
}: Readonly<{ control: EconomicControl; details: ReadonlyMap<string, PaymentDetail> }>) {
  if (control.unassigned.length === 0) return <EmptyState>No hay cobros sin concepto.</EmptyState>;
  let turn = 1;

  return (
    <div className="flex flex-col gap-8">
      <p className="reveal text-sm text-muted-foreground" style={reveal(0)}>
        Estos cobros no suman en «cobrado»: anular uno no cambia ninguna cifra, asignarlo la sube.{" "}
        {plural(control.unassigned.length, "cobro", "cobros")} · {formatEur(control.unassignedTotal)}.
      </p>
      {GROUPS.map((g) => {
        const entries = control.unassigned.filter((e) => e.verdict === g.verdict);
        if (entries.length === 0) return null;
        const headTurn = turn++;
        return (
          <section key={g.verdict} className="flex flex-col gap-2">
            <div className="reveal" style={reveal(headTurn)}>
              <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold text-foreground">
                {g.title}
                <Badge variant={g.verdict === "repeat" ? "warning" : g.verdict === "assign" ? "info" : "secondary"}>
                  {entries.length}
                </Badge>
              </h2>
              <p className="text-sm text-muted-foreground">{g.note}</p>
            </div>
            <ul className="flex flex-col">
              {entries.map((e) => (
                <Entry key={e.payment.id} e={e} detail={details.get(e.payment.id)} turn={turn++} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
