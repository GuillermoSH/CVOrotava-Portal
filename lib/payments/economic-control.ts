import {
  isUnassignedPayment,
  monthlyFeeCodes,
  obligationConcept,
  type FeeObligation,
} from "@/lib/payments/fees";
import type { PlayerFeeRow, PlayerPaymentFact } from "@/lib/payments/player-fee-rows";
import type { SeasonFeeLine } from "@/lib/types/db";

/**
 * Control económico: lo mismo que cuenta el inicio de /admin, pero con el detalle para resolverlo
 * (quién, qué concepto, qué cobro). Lógica pura sobre `PlayerFeeRow`; sin base de datos.
 */

type PlayerRef = { playerId: string; name: string; teamName: string | null };

export type OverdueEntry = PlayerRef & {
  total: number;
  /** Alguna de sus deudas ya es atrasada (su mes terminó). */
  hasLate: boolean;
  /** Conceptos vencidos con lo que falta de cada uno. */
  concepts: { label: string; remaining: number; late: boolean }[];
};

export type MatriculaEntry = PlayerRef & { amount: number; paidSoFar: number };

export type PaymentRef = {
  id: string;
  amount: number;
  date: string | null;
  method: string | null;
};

export type UnassignedEntry = PlayerRef & {
  payment: PaymentRef;
  /** Cobro con concepto del mismo jugador y el mismo importe: probable repetición. */
  twin: { concept: string; date: string | null } | null;
};

export type OverpaidEntry = PlayerRef & {
  concept: string;
  due: number;
  paid: number;
  excess: number;
  /** Los cobros que suman ese concepto, para decidir cuál sobra. */
  payments: PaymentRef[];
};

export type EconomicControl = {
  overdue: OverdueEntry[];
  overdueTotal: number;
  matricula: MatriculaEntry[];
  matriculaTotal: number;
  unassigned: UnassignedEntry[];
  unassignedTotal: number;
  /** Cuántos de los cobros sin concepto tienen un gemelo con concepto. */
  unassignedWithTwin: number;
  overpaid: OverpaidEntry[];
  overpaidTotal: number;
};

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

const ref = (p: PlayerPaymentFact): PaymentRef => ({
  id: p.id,
  amount: p.amount,
  date: p.paid_date,
  method: p.method,
});

function matchesObligation(p: PlayerPaymentFact, o: FeeObligation): boolean {
  if (p.status !== "paid" || p.fee_code !== o.code) return false;
  return o.month == null || p.billing_month === o.month;
}

export function buildEconomicControl({
  rows,
  lines,
}: {
  rows: readonly PlayerFeeRow[];
  lines: readonly SeasonFeeLine[];
}): EconomicControl {
  const monthlyCodes = monthlyFeeCodes(lines);
  const lineLabel = new Map(lines.map((l) => [l.code, l.label]));

  const overdue: OverdueEntry[] = [];
  const matricula: MatriculaEntry[] = [];
  const unassigned: UnassignedEntry[] = [];
  const overpaid: OverpaidEntry[] = [];

  for (const row of rows) {
    const who: PlayerRef = { playerId: row.id, name: row.full_name, teamName: row.team_name };

    const late = row.obligations.filter((o) => o.overdue && o.remaining > 0);
    if (late.length > 0) {
      overdue.push({
        ...who,
        total: roundCents(late.reduce((sum, o) => sum + o.remaining, 0)),
        hasLate: late.some((o) => o.late),
        concepts: late.map((o) => ({
          label: obligationConcept(o),
          remaining: o.remaining,
          late: o.late,
        })),
      });
    }

    const matriculaLine = row.obligations.find((o) => o.code === "matricula" && o.remaining > 0);
    if (matriculaLine) {
      matricula.push({ ...who, amount: matriculaLine.remaining, paidSoFar: matriculaLine.paid });
    }

    for (const o of row.obligations) {
      const excess = roundCents(o.paid - o.due);
      if (excess <= 0) continue;
      overpaid.push({
        ...who,
        concept: obligationConcept(o),
        due: o.due,
        paid: o.paid,
        excess,
        payments: row.payments.filter((p) => matchesObligation(p, o)).map(ref),
      });
    }

    // Cobros con concepto aún sin emparejar con un cobro libre del mismo importe.
    const assigned = row.payments.filter((p) => p.status === "paid" && !isUnassignedPayment(p, monthlyCodes));
    const usedTwins = new Set<string>();
    for (const p of row.payments) {
      if (!isUnassignedPayment(p, monthlyCodes)) continue;
      const twin = assigned.find((a) => !usedTwins.has(a.id) && Math.abs(a.amount - p.amount) < 0.005);
      if (twin) usedTwins.add(twin.id);
      unassigned.push({
        ...who,
        payment: ref(p),
        twin:
          twin && twin.fee_code
            ? {
                concept: obligationConcept({
                  label: lineLabel.get(twin.fee_code) ?? twin.fee_code,
                  month: twin.billing_month,
                }),
                date: twin.paid_date,
              }
            : null,
      });
    }
  }

  overdue.sort((a, b) => Number(b.hasLate) - Number(a.hasLate) || b.total - a.total);
  matricula.sort((a, b) => a.name.localeCompare(b.name, "es"));
  overpaid.sort((a, b) => b.excess - a.excess);
  // Primero los que tienen gemelo (los más seguros de anular), luego por jugador y fecha.
  unassigned.sort(
    (a, b) =>
      Number(Boolean(b.twin)) - Number(Boolean(a.twin)) ||
      a.name.localeCompare(b.name, "es") ||
      (a.payment.date ?? "").localeCompare(b.payment.date ?? ""),
  );

  const sum = (values: number[]) => roundCents(values.reduce((s, v) => s + v, 0));
  return {
    overdue,
    overdueTotal: sum(overdue.map((e) => e.total)),
    matricula,
    matriculaTotal: sum(matricula.map((e) => e.amount)),
    unassigned,
    unassignedTotal: sum(unassigned.map((e) => e.payment.amount)),
    unassignedWithTwin: unassigned.filter((e) => e.twin).length,
    overpaid,
    overpaidTotal: sum(overpaid.map((e) => e.excess)),
  };
}
