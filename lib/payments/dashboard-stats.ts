import { obligationConcept } from "@/lib/payments/fees";
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

export type PaymentsDashboard = {
  /** Cobrado en la temporada, incluidos cobros libres sin línea de tarifa. */
  seasonTotal: number;
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

  let seasonTotal = 0;
  let monthTotal = 0;
  let overdueTotal = 0;
  let overduePlayers = 0;
  let monthlyPaid = 0;
  let monthlyTarget = 0;
  const debtors: CriticalDebtor[] = [];
  const recent: RecentPayment[] = [];

  for (const row of rows) {
    for (const payment of row.payments) {
      seasonTotal += payment.amount;
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
    for (const o of row.obligations) {
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

  return {
    seasonTotal: roundCents(seasonTotal),
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
