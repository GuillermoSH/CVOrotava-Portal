import { obligationConcept, seasonMonthIndex } from "@/lib/payments/fees";
import type { PlayerFeeRow } from "@/lib/payments/player-fee-rows";
import type { SeasonFeeLine } from "@/lib/types/db";

/**
 * Cifras del inicio de /admin a partir de lo que ya calcula /admin/pagos
 * (`PlayerFeeRow`: tarifa − cobros anotados). Lógica pura, sin base de datos.
 */

/** Cuotas atrasadas (mes ya terminado) necesarias para contar a un jugador como moroso crítico. */
export const CRITICAL_OVERDUE_COUNT = 1;

export type CriticalDebtor = {
  id: string;
  name: string;
  teamName: string | null;
  lateCount: number;
  /** Deuda de lo atrasado (no incluye lo solo vencido). */
  balance: number;
};

export type RecentPayment = {
  id: string;
  playerName: string;
  teamName: string | null;
  concept: string;
  amount: number;
  method: string | null;
  date: string;
};

export type MonthCollection = {
  /** Mes natural (1–12). */
  month: number;
  /** Cuotas de ese mes (una por jugador con tarifa) y cuántas están al día. */
  due: number;
  paid: number;
  /** Importes de esas cuotas: previsto y cobrado dentro de la tarifa. */
  amountDue: number;
  amountPaid: number;
};

export type PaymentsDashboard = {
  /**
   * Cobrado en la temporada: lo que cierra una línea de tarifa (cobros con concepto), igual que
   * /admin/pagos. Los cobros sin concepto asignado van aparte en `unassigned` y no suman aquí:
   * entre ellos hay anotaciones antiguas repetidas por otras ya reintroducidas.
   */
  seasonTotal: number;
  /** Previsto de la temporada: todas las cuotas y pagos únicos de jugadores activos y no exentos. */
  expectedTotal: number;
  /** Parte de lo cobrado que cubre la tarifa (sin contar lo cobrado de más). */
  onTariffTotal: number;
  /** Cobrado por encima de lo que toca (p. ej. una matrícula anotada dos veces). */
  overpaid: number;
  /** Cobros que no cierran ninguna línea (sin concepto o sin mes). */
  unassigned: { count: number; total: number };
  /** Cuotas mensuales por mes de la temporada, en orden de calendario de temporada. */
  byMonth: MonthCollection[];
  /** Jugadores con la matrícula pendiente y lo que suma. */
  withoutMatricula: { players: number; amount: number };
  /** Cobrado con `paid_date` en el mes natural de hoy. */
  monthTotal: number;
  /** Mensualidades del mes corriente ya cerradas / que tocan cobrar. */
  monthly: { month: number; paid: number; target: number } | null;
  /** Lo vencido sin cobrar (únicos pasados de fecha y mensualidades desde el día 10). */
  overdueTotal: number;
  /** Jugadores con alguna deuda vencida. */
  overduePlayers: number;
  debtors: CriticalDebtor[];
  recent: RecentPayment[];
};

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/** YYYY-MM del día de hoy, comparable con `paid_date` (YYYY-MM-DD). */
function monthKey(today: Date): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

export function buildPaymentsDashboard({
  rows,
  lines,
  today,
  recentLimit = 6,
}: {
  rows: readonly PlayerFeeRow[];
  lines: readonly SeasonFeeLine[];
  today: Date;
  recentLimit?: number;
}): PaymentsDashboard {
  const currentMonth = today.getMonth() + 1;
  const thisMonth = monthKey(today);
  const lineLabel = new Map(lines.map((l) => [l.code, l.label]));

  let paymentsTotal = 0;
  let unassignedCount = 0;
  let unassignedTotal = 0;
  let expectedTotal = 0;
  let onTariffTotal = 0;
  let overpaid = 0;
  let matriculaPlayers = 0;
  let matriculaAmount = 0;
  const monthly = new Map<number, MonthCollection>();
  let monthTotal = 0;
  let overdueTotal = 0;
  let overduePlayers = 0;
  let monthlyPaid = 0;
  let monthlyTarget = 0;
  const debtors: CriticalDebtor[] = [];
  const recent: RecentPayment[] = [];

  for (const row of rows) {
    unassignedCount += row.unassigned.count;
    unassignedTotal += row.unassigned.total;
    for (const payment of row.payments) {
      paymentsTotal += payment.amount;
      if (payment.paid_date?.startsWith(thisMonth)) monthTotal += payment.amount;
      if (payment.paid_date) {
        recent.push({
          id: payment.id,
          playerName: row.full_name,
          teamName: row.team_name,
          concept: paymentConcept(payment.fee_code, payment.billing_month, lineLabel),
          amount: payment.amount,
          method: payment.method,
          date: payment.paid_date,
        });
      }
    }

    let overdueCount = 0;
    let overdueBalance = 0;
    let lateCount = 0;
    let lateBalance = 0;
    let missingMatricula = false;
    for (const o of row.obligations) {
      expectedTotal += o.due;
      onTariffTotal += Math.min(o.paid, o.due);
      overpaid += Math.max(0, o.paid - o.due);
      if (o.code === "matricula" && o.remaining > 0) {
        missingMatricula = true;
        matriculaAmount += o.remaining;
      }
      if (o.kind === "monthly" && o.month != null) {
        const entry = monthly.get(o.month) ?? {
          month: o.month,
          due: 0,
          paid: 0,
          amountDue: 0,
          amountPaid: 0,
        };
        entry.due += 1;
        entry.amountDue += o.due;
        entry.amountPaid += Math.min(o.paid, o.due);
        if (o.remaining === 0) entry.paid += 1;
        monthly.set(o.month, entry);
      }
      if (o.kind === "monthly" && o.month === currentMonth) {
        monthlyTarget += 1;
        if (o.remaining === 0) monthlyPaid += 1;
      }
      if (o.overdue && o.remaining > 0) {
        overdueCount += 1;
        overdueBalance += o.remaining;
        if (o.late) {
          lateCount += 1;
          lateBalance += o.remaining;
        }
      }
    }

    if (missingMatricula) matriculaPlayers += 1;
    if (overdueCount > 0) {
      overduePlayers += 1;
      overdueTotal += overdueBalance;
    }
    if (lateCount >= CRITICAL_OVERDUE_COUNT) {
      debtors.push({
        id: row.id,
        name: row.full_name,
        teamName: row.team_name,
        lateCount,
        balance: roundCents(lateBalance),
      });
    }
  }

  debtors.sort((a, b) => b.balance - a.balance || b.lateCount - a.lateCount);
  recent.sort((a, b) => b.date.localeCompare(a.date));

  const byMonth = [...monthly.values()]
    .sort((a, b) => seasonMonthIndex(a.month) - seasonMonthIndex(b.month))
    .map((m) => ({ ...m, amountDue: roundCents(m.amountDue), amountPaid: roundCents(m.amountPaid) }));

  return {
    seasonTotal: roundCents(paymentsTotal - unassignedTotal),
    expectedTotal: roundCents(expectedTotal),
    onTariffTotal: roundCents(onTariffTotal),
    overpaid: roundCents(overpaid),
    unassigned: { count: unassignedCount, total: roundCents(unassignedTotal) },
    byMonth,
    withoutMatricula: { players: matriculaPlayers, amount: roundCents(matriculaAmount) },
    monthTotal: roundCents(monthTotal),
    monthly: monthlyTarget > 0 ? { month: currentMonth, paid: monthlyPaid, target: monthlyTarget } : null,
    overdueTotal: roundCents(overdueTotal),
    overduePlayers,
    debtors,
    recent: recent.slice(0, recentLimit),
  };
}

function paymentConcept(
  feeCode: string | null,
  billingMonth: number | null,
  lineLabel: ReadonlyMap<string, string>,
): string {
  if (!feeCode) return "Cobro libre";
  const label = lineLabel.get(feeCode) ?? feeCode;
  return obligationConcept({ label, month: billingMonth });
}
