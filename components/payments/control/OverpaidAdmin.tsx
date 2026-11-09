import { Badge } from "@/components/club/Badge";
import { AnnulPaymentButton } from "@/components/payments/AnnulPaymentButton";
import { AssignPaymentButton } from "@/components/payments/AssignPaymentButton";
import { formatEur } from "@/lib/format/currency";
import {
  suggestAnnul,
  type EconomicControl,
  type OverpaidEntry,
  type PaymentDetail,
} from "@/lib/payments/economic-control";
import { EmptyState, PaymentDetailLines, PlayerLink, paymentLine, plural } from "./shared";

function Entry({
  e,
  suggested,
  details,
}: Readonly<{ e: OverpaidEntry; suggested: string | null; details: ReadonlyMap<string, PaymentDetail> }>) {
  return (
    <li className="flex flex-col gap-3 border-t border-[var(--club-border)] py-4 first:border-t-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PlayerLink id={e.playerId} name={e.name} teamName={e.teamName} />
        <span className="shrink-0 text-right">
          <span className="block text-sm font-semibold tabular-nums text-foreground">+{formatEur(e.excess)}</span>
          <span className="block text-xs text-muted-foreground">
            {e.concept}: {formatEur(e.paid)} de {formatEur(e.due)}
          </span>
        </span>
      </div>

      <ul className="flex flex-col gap-3 border-l-2 border-[var(--club-border)] pl-3">
        {e.payments.map((p) => {
          const targets = e.assignTargets.filter((t) => t.paymentId === p.id);
          return (
            <li key={p.id} className="flex flex-col gap-1.5">
              <span className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                {paymentLine(p)}
                {p.id === suggested ? <Badge variant="warning">Sugerido anular</Badge> : null}
              </span>
              <PaymentDetailLines detail={details.get(p.id)} />
              <span className="flex flex-wrap items-center gap-2">
                {targets.map((t) => (
                  <AssignPaymentButton
                    key={`${t.code}-${t.month}`}
                    paymentId={p.id}
                    code={t.code}
                    month={t.month}
                    label={t.label}
                    verb="Mover a"
                  />
                ))}
                <AnnulPaymentButton paymentId={p.id} />
              </span>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

export function OverpaidAdmin({
  control,
  details,
}: Readonly<{ control: EconomicControl; details: ReadonlyMap<string, PaymentDetail> }>) {
  if (control.overpaid.length === 0) return <EmptyState>Nada cobrado por encima de la tarifa.</EmptyState>;

  const withSuggestion = control.overpaid.map((e) => ({ e, suggested: suggestAnnul(e, details) }));
  const duplicates = withSuggestion.filter((x) => x.suggested);
  const others = withSuggestion.filter((x) => !x.suggested);

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted-foreground">
        {formatEur(control.overpaidTotal)} por encima de la tarifa en {plural(control.overpaid.length, "concepto", "conceptos")}.
        Anular un cobro baja lo cobrado; moverlo a otra deuda abierta lo mantiene y cierra esa deuda.
      </p>

      {duplicates.length > 0 ? (
        <section className="flex flex-col gap-2">
          <div>
            <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold text-foreground">
              Probables duplicados <Badge variant="warning">{duplicates.length}</Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              Hay varios cobros del mismo importe y quitar uno deja el concepto cubierto. Se sugiere el último que se
              anotó: comprueba el banco antes de anular.
            </p>
          </div>
          <ul className="flex flex-col">
            {duplicates.map(({ e, suggested }) => (
              <Entry key={`${e.playerId}-${e.concept}`} e={e} suggested={suggested} details={details} />
            ))}
          </ul>
        </section>
      ) : null}

      {others.length > 0 ? (
        <section className="flex flex-col gap-2">
          <div>
            <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold text-foreground">
              Importe superior a la tarifa <Badge variant="secondary">{others.length}</Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              No hay un duplicado claro: se pagó más de lo que toca o con importes distintos. Puede ser un abono a cuenta
              del siguiente pago.
            </p>
          </div>
          <ul className="flex flex-col">
            {others.map(({ e }) => (
              <Entry key={`${e.playerId}-${e.concept}`} e={e} suggested={null} details={details} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
