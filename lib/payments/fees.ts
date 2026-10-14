import { seasonStartYear, type SeasonId } from "@/lib/season";
import type { FeeAudience, FeeLineKind, SeasonFeeLine } from "@/lib/types/db";

/**
 * Lógica pura de tarifas: qué debe un jugador y cuánto le queda. No toca la base
 * de datos: las deudas no se insertan en `payments` (tabla compartida con Team
 * Manager), se calculan como tarifa de la temporada menos lo anotado.
 */

/** Meses naturales en el orden de la temporada (arranca en septiembre, como getCurrentSeason). */
export const SEASON_MONTH_ORDER = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8] as const;

const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

const MONTH_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

export const FEE_AUDIENCES: FeeAudience[] = ["base", "senior", "aficionados"];

export const FEE_AUDIENCE_LABELS: Record<FeeAudience, string> = {
  base: "Base (minivoley–júnior)",
  senior: "Sénior",
  aficionados: "Aficionados",
};

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? String(month);
}

export function monthShort(month: number): string {
  return MONTH_SHORT[month - 1] ?? String(month);
}

/** Posición del mes dentro de la temporada (septiembre = 0). */
export function seasonMonthIndex(month: number): number {
  return SEASON_MONTH_ORDER.indexOf(month as (typeof SEASON_MONTH_ORDER)[number]);
}

export function sortSeasonMonths(months: readonly number[]): number[] {
  return [...months].sort((a, b) => seasonMonthIndex(a) - seasonMonthIndex(b));
}

/** Audiencia de cobro según la categoría del equipo; sin equipo no genera cuotas. */
export function audienceForCategory(category: string | null | undefined): FeeAudience | null {
  if (!category) return null;
  if (category === "senior") return "senior";
  if (category === "aficionados") return "aficionados";
  return "base";
}

/** Año natural en que cae un mes de la temporada (sep–dic = año de inicio; ene–ago = siguiente). */
export function seasonMonthYear(season: SeasonId, month: number): number {
  const start = seasonStartYear(season);
  return month >= 9 ? start : start + 1;
}

/** Un mes está vencido cuando el calendario ya está en él o en uno posterior de la temporada. */
export function isSeasonMonthDue(season: SeasonId, month: number, today: Date): boolean {
  const year = seasonMonthYear(season, month);
  const todayKey = today.getFullYear() * 12 + today.getMonth();
  const monthKey = year * 12 + (month - 1);
  return todayKey >= monthKey;
}

/** YYYY-MM-DD en calendario local (evita desfaces UTC al comparar con `due_date`). */
export function localDateKey(today: Date): string {
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Pago único atrasado tras la fecha límite (el día límite aún cuenta a tiempo).
 * Sin `due_date` → vencido (comportamiento histórico).
 */
export function isOnceFeeOverdue(dueDate: string | null | undefined, today: Date): boolean {
  if (!dueDate) return true;
  return localDateKey(today) > dueDate;
}

/** Importe unitario de una línea para un jugador; null si todavía no tiene importe. */
export function lineAmountFor(
  line: Pick<SeasonFeeLine, "amount" | "amount_extended" | "kind">,
  audience: FeeAudience,
  paysExtendedMonthly: boolean,
): number | null {
  if (
    line.kind === "monthly" &&
    audience === "base" &&
    paysExtendedMonthly &&
    line.amount_extended != null
  ) {
    return line.amount_extended;
  }
  return line.amount;
}

export type FeePaymentLike = {
  amount: number;
  status: string;
  fee_code: string | null;
  billing_month: number | null;
};

export type FeeObligation = {
  /** `code` para únicos, `code:mes` para mensualidades. */
  key: string;
  code: string;
  label: string;
  kind: FeeLineKind;
  month: number | null;
  due: number;
  paid: number;
  remaining: number;
  /**
   * Vencido / atrasado: únicos según `due_date` (o siempre si no hay fecha);
   * mensualidades cuando el mes de temporada ya ha empezado.
   */
  overdue: boolean;
};

export function obligationKey(code: string, month: number | null): string {
  return month == null ? code : `${code}:${month}`;
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumPaid(
  payments: readonly FeePaymentLike[],
  code: string,
  month: number | null,
): number {
  let total = 0;
  for (const payment of payments) {
    if (payment.status !== "paid") continue;
    if (payment.fee_code !== code) continue;
    if (month != null && payment.billing_month !== month) continue;
    total += payment.amount;
  }
  return roundCents(total);
}

/** Todo lo que cubre la tarifa del jugador, con lo ya cobrado y el resto por concepto/mes. */
export function computeObligations({
  season,
  audience,
  paysExtendedMonthly,
  lines,
  payments,
  today,
}: {
  season: SeasonId;
  audience: FeeAudience | null;
  paysExtendedMonthly: boolean;
  lines: readonly SeasonFeeLine[];
  payments: readonly FeePaymentLike[];
  today: Date;
}): FeeObligation[] {
  if (!audience) return [];

  const out: FeeObligation[] = [];
  const audienceLines = lines
    .filter((line) => line.audience === audience)
    .sort((a, b) => a.sort_order - b.sort_order);

  for (const line of audienceLines) {
    const amount = lineAmountFor(line, audience, paysExtendedMonthly);
    if (amount == null) continue;

    if (line.kind === "once") {
      const paid = sumPaid(payments, line.code, null);
      out.push({
        key: obligationKey(line.code, null),
        code: line.code,
        label: line.label,
        kind: "once",
        month: null,
        due: amount,
        paid,
        remaining: Math.max(0, roundCents(amount - paid)),
        overdue: isOnceFeeOverdue(line.due_date, today),
      });
      continue;
    }

    for (const month of sortSeasonMonths(line.months)) {
      const paid = sumPaid(payments, line.code, month);
      out.push({
        key: obligationKey(line.code, month),
        code: line.code,
        label: line.label,
        kind: "monthly",
        month,
        due: amount,
        paid,
        remaining: Math.max(0, roundCents(amount - paid)),
        overdue: isSeasonMonthDue(season, month, today),
      });
    }
  }

  return out;
}

export function openObligations(obligations: readonly FeeObligation[]): FeeObligation[] {
  return obligations.filter((o) => o.remaining > 0);
}

/** Pendientes ordenados: lo vencido primero, luego los meses por llegar. */
export function sortOpenObligations(obligations: readonly FeeObligation[]): FeeObligation[] {
  const open = openObligations(obligations);
  return [...open.filter((o) => o.overdue), ...open.filter((o) => !o.overdue)];
}

/**
 * Cobros pagados que no cierran ninguna línea: sin fee_code, o mensualidad antigua
 * sin mes (no se adivina el mes). El listado los muestra aparte.
 */
export function unassignedPaidPayments(
  payments: readonly FeePaymentLike[],
  lines: readonly SeasonFeeLine[],
): { count: number; total: number } {
  const monthlyCodes = new Set(lines.filter((l) => l.kind === "monthly").map((l) => l.code));
  let count = 0;
  let total = 0;
  for (const payment of payments) {
    if (payment.status !== "paid") continue;
    const unassigned =
      payment.fee_code == null ||
      (monthlyCodes.has(payment.fee_code) && payment.billing_month == null);
    if (!unassigned) continue;
    count += 1;
    total += payment.amount;
  }
  return { count, total: roundCents(total) };
}

export type MonthlyGroup = {
  code: string;
  label: string;
  months: number[];
  remaining: number;
};

export type PendingSummary = {
  overdueOnce: FeeObligation[];
  overdueMonthly: MonthlyGroup[];
  upcomingMonthly: MonthlyGroup[];
  hasOverdue: boolean;
  hasUpcoming: boolean;
};

function groupMonthly(obligations: readonly FeeObligation[]): MonthlyGroup[] {
  const byCode = new Map<string, MonthlyGroup>();
  for (const o of obligations) {
    if (o.kind !== "monthly" || o.month == null) continue;
    const group = byCode.get(o.code) ?? {
      code: o.code,
      label: o.label,
      months: [],
      remaining: 0,
    };
    group.months.push(o.month);
    group.remaining = roundCents(group.remaining + o.remaining);
    byCode.set(o.code, group);
  }
  return [...byCode.values()].map((g) => ({ ...g, months: sortSeasonMonths(g.months) }));
}

export function summarizeObligations(obligations: readonly FeeObligation[]): PendingSummary {
  const open = openObligations(obligations);
  const overdue = open.filter((o) => o.overdue);
  const upcoming = open.filter((o) => !o.overdue);
  const overdueMonthly = groupMonthly(overdue);
  const upcomingMonthly = groupMonthly(upcoming);
  return {
    overdueOnce: overdue.filter((o) => o.kind === "once"),
    overdueMonthly,
    upcomingMonthly,
    hasOverdue: overdue.length > 0,
    hasUpcoming: upcoming.length > 0,
  };
}

/** `Oct–Jun · 9`, `Oct, Nov · 2` o `Mar`: rachas consecutivas de la temporada y el total. */
export function formatMonthGroup(months: readonly number[]): string {
  const ordered = sortSeasonMonths(months);
  if (ordered.length === 0) return "";

  const runs: number[][] = [];
  for (const month of ordered) {
    const run = runs[runs.length - 1];
    const last = run?.[run.length - 1];
    if (run && last != null && seasonMonthIndex(month) === seasonMonthIndex(last) + 1) {
      run.push(month);
    } else {
      runs.push([month]);
    }
  }

  const label = runs
    .map((run) =>
      run.length >= 3
        ? `${monthShort(run[0])}–${monthShort(run[run.length - 1])}`
        : run.map(monthShort).join(", "),
    )
    .join(", ");

  return ordered.length > 1 ? `${label} · ${ordered.length}` : label;
}

/** Texto del concepto que se anota en `payments.concept`: `Cuota mensual — octubre`. */
export function obligationConcept(obligation: Pick<FeeObligation, "label" | "month">): string {
  return obligation.month == null
    ? obligation.label
    : `${obligation.label} — ${monthName(obligation.month)}`;
}
