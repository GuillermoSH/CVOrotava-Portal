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
 * (quién, qué concepto, qué cobro, qué hacer con él). Lógica pura sobre `PlayerFeeRow`.
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

/** Deuda abierta a la que se podría reasignar un cobro (mismo importe que lo que falta). */
export type AssignTarget = {
  code: string;
  month: number | null;
  label: string;
  remaining: number;
};

export type UnassignedEntry = PlayerRef & {
  payment: PaymentRef;
  /** Cobros con concepto del mismo jugador y el mismo importe: probable repetición. */
  twins: { id: string; concept: string; date: string | null }[];
  /** Otro cobro libre del mismo jugador con igual importe y fecha. */
  repeatsFree: boolean;
  /** Deudas abiertas que este cobro cubriría exactamente. */
  assignTargets: AssignTarget[];
  /** Lo que se recomienda hacer: anular (repetido), asignar (cubre una deuda) o revisar a mano. */
  verdict: "repeat" | "assign" | "review";
};

export type OverpaidPayment = PaymentRef & { code: string | null; month: number | null };

export type OverpaidEntry = PlayerRef & {
  concept: string;
  due: number;
  paid: number;
  excess: number;
  /** Los cobros que suman ese concepto, para decidir cuál sobra. */
  payments: OverpaidPayment[];
  /** Deudas abiertas del jugador que un cobro de más cubriría exactamente. */
  assignTargets: (AssignTarget & { paymentId: string })[];
};

export type EconomicControl = {
  overdue: OverdueEntry[];
  overdueTotal: number;
  overdueLate: number;
  matricula: MatriculaEntry[];
  matriculaTotal: number;
  unassigned: UnassignedEntry[];
  unassignedTotal: number;
  overpaid: OverpaidEntry[];
  overpaidTotal: number;
};

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

const sameAmount = (a: number, b: number) => Math.abs(a - b) < 0.005;

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

    const open = row.obligations.filter((o) => o.remaining > 0);
    const targetsFor = (amount: number): AssignTarget[] =>
      open
        .filter((o) => sameAmount(o.remaining, amount))
        .map((o) => ({ code: o.code, month: o.month, label: obligationConcept(o), remaining: o.remaining }));

    for (const o of row.obligations) {
      const excess = roundCents(o.paid - o.due);
      if (excess <= 0) continue;
      const payments = row.payments
        .filter((p) => matchesObligation(p, o))
        .map((p) => ({ ...ref(p), code: p.fee_code, month: p.billing_month }));
      overpaid.push({
        ...who,
        concept: obligationConcept(o),
        due: o.due,
        paid: o.paid,
        excess,
        payments,
        assignTargets: payments.flatMap((p) =>
          targetsFor(p.amount).map((t) => ({ ...t, paymentId: p.id })),
        ),
      });
    }

    const free = row.payments.filter((p) => isUnassignedPayment(p, monthlyCodes));
    const assigned = row.payments.filter((p) => p.status === "paid" && !isUnassignedPayment(p, monthlyCodes));
    for (const p of free) {
      const twins = assigned
        .filter((a) => sameAmount(a.amount, p.amount) && a.fee_code)
        .map((a) => ({
          id: a.id,
          concept: obligationConcept({
            label: lineLabel.get(a.fee_code as string) ?? (a.fee_code as string),
            month: a.billing_month,
          }),
          date: a.paid_date,
        }));
      const repeatsFree = free.some(
        (f) => f.id !== p.id && sameAmount(f.amount, p.amount) && f.paid_date === p.paid_date,
      );
      const assignTargets = targetsFor(p.amount);
      unassigned.push({
        ...who,
        payment: ref(p),
        twins,
        repeatsFree,
        assignTargets,
        verdict: twins.length > 0 || repeatsFree ? "repeat" : assignTargets.length > 0 ? "assign" : "review",
      });
    }
  }

  const verdictOrder = { repeat: 0, assign: 1, review: 2 } as const;
  overdue.sort((a, b) => Number(b.hasLate) - Number(a.hasLate) || b.total - a.total);
  matricula.sort((a, b) => a.name.localeCompare(b.name, "es"));
  overpaid.sort((a, b) => b.excess - a.excess || a.name.localeCompare(b.name, "es"));
  unassigned.sort(
    (a, b) =>
      verdictOrder[a.verdict] - verdictOrder[b.verdict] ||
      a.name.localeCompare(b.name, "es") ||
      (a.payment.date ?? "").localeCompare(b.payment.date ?? ""),
  );

  const sum = (values: number[]) => roundCents(values.reduce((s, v) => s + v, 0));
  return {
    overdue,
    overdueTotal: sum(overdue.map((e) => e.total)),
    overdueLate: overdue.filter((e) => e.hasLate).length,
    matricula,
    matriculaTotal: sum(matricula.map((e) => e.amount)),
    unassigned,
    unassignedTotal: sum(unassigned.map((e) => e.payment.amount)),
    overpaid,
    overpaidTotal: sum(overpaid.map((e) => e.excess)),
  };
}

/** Datos extra de un cobro (de la tabla `payments`) que no están en los hechos de la temporada. */
export type PaymentDetail = {
  id: string;
  concept: string;
  notes: string | null;
  createdAt: string;
};

/**
 * Qué cobro de un concepto cobrado de más conviene anular: uno de importe repetido cuyo retiro deja
 * el concepto igualmente cubierto. Entre los repetidos, el último que se anotó. null = no hay un
 * candidato claro (p. ej. un solo cobro con importe superior a la tarifa).
 */
export function suggestAnnul(
  entry: Pick<OverpaidEntry, "payments" | "due" | "paid">,
  details: ReadonlyMap<string, PaymentDetail>,
): string | null {
  const candidates = entry.payments.filter(
    (p) =>
      entry.payments.some((q) => q.id !== p.id && sameAmount(q.amount, p.amount)) &&
      entry.paid - p.amount >= entry.due - 0.005,
  );
  if (candidates.length === 0) return null;
  const stamp = (p: OverpaidPayment) => details.get(p.id)?.createdAt ?? p.date ?? "";
  return [...candidates].sort((a, b) => stamp(b).localeCompare(stamp(a)))[0].id;
}
