import type { PaymentsDashboard } from "@/lib/payments/dashboard-stats";
import { cn } from "@/lib/utils";
import { formatEur } from "@/lib/format/currency";

const pct = new Intl.NumberFormat("es-ES", { style: "percent", maximumFractionDigits: 0 });

function Cell({
  label,
  value,
  caption,
  children,
}: Readonly<{
  label: string;
  value: string;
  caption: string;
  children?: React.ReactNode;
}>) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-5 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      {children}
      <p className="text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}

function Track({ ratio, label }: Readonly<{ ratio: number; label: string }>) {
  return (
    <div
      className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--club-brand)_14%,transparent)]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      aria-label={label}
    >
      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, ratio * 100)}%` }} />
    </div>
  );
}

/**
 * Cuatro cifras en un único bloque dividido por líneas (sin una tarjeta por cifra): cuánto se ha
 * cobrado, cuánto está vencido, cuántas altas están completas y cuánta ropa hay en el almacén.
 * Sin acceso a pagos solo quedan las dos últimas.
 */
export function HomeKpiStrip({
  payments,
  roster,
  clothing,
}: Readonly<{
  payments: PaymentsDashboard | null;
  roster: { active: number; complete: number; incomplete: number };
  clothing: { storedUnits: number; pendingStorageUnits: number; openOrders: number };
}>) {
  const paid = payments && payments.expectedTotal > 0 ? payments.onTariffTotal / payments.expectedTotal : 0;
  const altas = roster.active > 0 ? roster.complete / roster.active : 0;

  return (
    <div
      className={cn(
        "grid grid-cols-2 divide-[var(--club-border)] rounded-xl border border-[var(--club-border)] bg-[var(--club-surface)] max-lg:divide-y",
        payments ? "lg:grid-cols-4 lg:divide-x" : "lg:grid-cols-2 lg:divide-x",
      )}
      role="group"
      aria-label="Indicadores del club"
    >
      {payments ? (
        <>
          <Cell
            label="Cobrado esta temporada"
            value={formatEur(payments.seasonTotal)}
            caption={
              payments.expectedTotal > 0
                ? `${pct.format(paid)} de ${formatEur(payments.expectedTotal)} previstos`
                : "Sin tarifa prevista todavía"
            }
          >
            {payments.expectedTotal > 0 ? <Track ratio={paid} label="Cobrado sobre lo previsto" /> : null}
          </Cell>
          <Cell
            label="Vencido sin cobrar"
            value={formatEur(payments.overdueTotal)}
            caption={
              payments.overduePlayers === 0
                ? "Nadie con pagos vencidos"
                : `${payments.overduePlayers} jugadores · ${payments.debtors.length} con pagos atrasados`
            }
          />
        </>
      ) : null}
      <Cell
        label="Altas completas"
        value={`${roster.complete} de ${roster.active}`}
        caption={roster.incomplete === 0 ? "Toda la plantilla al día" : `${roster.incomplete} por completar`}
      >
        {roster.active > 0 ? <Track ratio={altas} label="Altas completas sobre la plantilla" /> : null}
      </Cell>
      <Cell
        label="Ropa en el almacén"
        value={`${clothing.storedUnits} uds.`}
        caption={`${clothing.openOrders} ${clothing.openOrders === 1 ? "pedido abierto" : "pedidos abiertos"} · ${clothing.pendingStorageUnits} por ubicar`}
      />
    </div>
  );
}
