import { describe, expect, it } from "vitest";

import {
  audienceForCategory,
  computeObligations,
  formatMonthGroup,
  isOnceFeeLate,
  isOnceFeeOverdue,
  isSeasonMonthDue,
  isSeasonMonthLate,
  obligationConcept,
  openObligations,
  summarizeObligations,
  unassignedPaidPayments,
  type FeePaymentLike,
} from "@/lib/payments/fees";
import type { FeeAudience, SeasonFeeLine } from "@/lib/types/db";

const SEASON = "2026-27";

function line(
  partial: Partial<SeasonFeeLine> & Pick<SeasonFeeLine, "audience" | "code" | "kind">,
): SeasonFeeLine {
  return {
    id: `${partial.audience}-${partial.code}`,
    season: SEASON,
    label: partial.code,
    amount: null,
    amount_extended: null,
    months: [],
    due_date: null,
    sort_order: 0,
    ...partial,
  };
}

const LINES: SeasonFeeLine[] = [
  line({ audience: "base", code: "matricula", label: "Matrícula", kind: "once", amount: 75, sort_order: 1 }),
  line({ audience: "base", code: "equipacion", label: "Equipación", kind: "once", amount: null, sort_order: 2 }),
  line({
    audience: "base",
    code: "mensualidad",
    label: "Cuota mensual",
    kind: "monthly",
    amount: 25,
    amount_extended: 30,
    months: [10, 11, 12, 1, 2, 3, 4, 5, 6],
    sort_order: 3,
  }),
  line({ audience: "senior", code: "matricula", label: "Matrícula", kind: "once", amount: 75, sort_order: 1 }),
  line({ audience: "senior", code: "pago_unico", label: "Pago único", kind: "once", amount: 90, sort_order: 2 }),
  line({
    audience: "senior",
    code: "mensualidad",
    label: "Cuota mensual",
    kind: "monthly",
    amount: 25,
    months: [1, 2, 3],
    sort_order: 3,
  }),
  line({ audience: "aficionados", code: "matricula", label: "Matrícula", kind: "once", amount: 75, sort_order: 1 }),
  line({ audience: "aficionados", code: "pago_unico", label: "Pago único", kind: "once", amount: 90, sort_order: 2 }),
];

// 13 de octubre de 2026: octubre vencido, noviembre en adelante todavía no.
const TODAY = new Date(2026, 9, 13);

function paid(partial: Partial<FeePaymentLike> & { amount: number }): FeePaymentLike {
  return { status: "paid", fee_code: null, billing_month: null, ...partial };
}

function obligations(
  audience: FeeAudience | null,
  payments: FeePaymentLike[] = [],
  paysExtendedMonthly = false,
) {
  return computeObligations({
    season: SEASON,
    audience,
    paysExtendedMonthly,
    lines: LINES,
    payments,
    today: TODAY,
  });
}

describe("audienceForCategory", () => {
  it("maps categories to the three audiences", () => {
    expect(audienceForCategory("minivoley")).toBe("base");
    expect(audienceForCategory("junior")).toBe("base");
    expect(audienceForCategory("senior")).toBe("senior");
    expect(audienceForCategory("aficionados")).toBe("aficionados");
  });

  it("returns null for a player without team", () => {
    expect(audienceForCategory(null)).toBeNull();
    expect(audienceForCategory(undefined)).toBeNull();
  });
});

describe("isSeasonMonthDue", () => {
  it("treats the current month and earlier ones as due", () => {
    expect(isSeasonMonthDue(SEASON, 9, TODAY)).toBe(true);
    expect(isSeasonMonthDue(SEASON, 10, TODAY)).toBe(true);
  });

  it("keeps later months of the season as not due yet", () => {
    expect(isSeasonMonthDue(SEASON, 11, TODAY)).toBe(false);
    expect(isSeasonMonthDue(SEASON, 1, TODAY)).toBe(false);
    expect(isSeasonMonthDue(SEASON, 6, TODAY)).toBe(false);
  });

  it("resolves January of the season to the following calendar year", () => {
    expect(isSeasonMonthDue(SEASON, 1, new Date(2027, 0, 12))).toBe(true);
    expect(isSeasonMonthDue(SEASON, 1, new Date(2026, 11, 31))).toBe(false);
  });
});

describe("isSeasonMonthDue / isSeasonMonthLate (día 10 y fin de mes)", () => {
  it("vence el día 10 del propio mes, no antes", () => {
    expect(isSeasonMonthDue(SEASON, 10, new Date(2026, 9, 9))).toBe(false);
    expect(isSeasonMonthDue(SEASON, 10, new Date(2026, 9, 10))).toBe(true);
  });

  it("queda atrasada solo cuando el mes ha terminado", () => {
    expect(isSeasonMonthLate(SEASON, 10, new Date(2026, 9, 31))).toBe(false);
    expect(isSeasonMonthLate(SEASON, 10, new Date(2026, 10, 1))).toBe(true);
    expect(isSeasonMonthLate(SEASON, 1, new Date(2027, 0, 20))).toBe(false);
    expect(isSeasonMonthLate(SEASON, 1, new Date(2027, 1, 1))).toBe(true);
  });
});

describe("isOnceFeeOverdue", () => {
  it("treats a missing due date as already overdue", () => {
    expect(isOnceFeeOverdue(null, TODAY)).toBe(true);
    expect(isOnceFeeOverdue(undefined, TODAY)).toBe(true);
  });

  it("is overdue from day 10 of the due month, whatever the day of the date", () => {
    expect(isOnceFeeOverdue("2026-10-31", new Date(2026, 9, 9))).toBe(false);
    expect(isOnceFeeOverdue("2026-10-31", new Date(2026, 9, 10))).toBe(true);
  });

  it("is not overdue when the due month is in the future", () => {
    expect(isOnceFeeOverdue("2026-11-01", TODAY)).toBe(false);
  });

  it("is late only once the due month has ended", () => {
    expect(isOnceFeeLate("2026-10-01", TODAY)).toBe(false);
    expect(isOnceFeeLate("2026-09-15", TODAY)).toBe(true);
    expect(isOnceFeeLate("2026-12-15", new Date(2026, 11, 31))).toBe(false);
    expect(isOnceFeeLate("2026-12-15", new Date(2027, 0, 1))).toBe(true);
    expect(isOnceFeeLate(null, TODAY)).toBe(true);
  });
});

describe("computeObligations — base", () => {
  it("returns nothing without audience (player without team)", () => {
    expect(obligations(null)).toEqual([]);
  });

  it("generates matrícula and nine monthly fees; equipment without amount adds no debt", () => {
    const result = obligations("base");
    expect(result.map((o) => o.code)).not.toContain("equipacion");
    expect(result.filter((o) => o.kind === "once")).toHaveLength(1);
    expect(result.filter((o) => o.kind === "monthly")).toHaveLength(9);
  });

  it("orders months by season (October first, January after December)", () => {
    const months = obligations("base")
      .filter((o) => o.kind === "monthly")
      .map((o) => o.month);
    expect(months).toEqual([10, 11, 12, 1, 2, 3, 4, 5, 6]);
  });

  it("uses 25 € by default and 30 € for the extended monthly flag", () => {
    const normal = obligations("base").find((o) => o.key === "mensualidad:10");
    const extended = obligations("base", [], true).find((o) => o.key === "mensualidad:10");
    expect(normal?.due).toBe(25);
    expect(extended?.due).toBe(30);
  });

  it("ignores the extended flag outside base", () => {
    const senior = obligations("senior", [], true).find((o) => o.key === "mensualidad:1");
    expect(senior?.due).toBe(25);
  });

  it("marks only October as overdue among the monthly fees", () => {
    const monthly = obligations("base").filter((o) => o.kind === "monthly");
    expect(monthly.filter((o) => o.overdue).map((o) => o.month)).toEqual([10]);
  });

  it("closes a month when it is paid in full", () => {
    const result = obligations("base", [
      paid({ amount: 25, fee_code: "mensualidad", billing_month: 10 }),
    ]);
    expect(result.find((o) => o.key === "mensualidad:10")?.remaining).toBe(0);
    expect(openObligations(result).map((o) => o.key)).not.toContain("mensualidad:10");
  });

  it("keeps the month open for the difference on a partial payment", () => {
    const result = obligations("base", [
      paid({ amount: 10, fee_code: "mensualidad", billing_month: 10 }),
    ]);
    expect(result.find((o) => o.key === "mensualidad:10")?.remaining).toBe(15);
  });

  it("adds up several payments of the same concept and month", () => {
    const result = obligations("base", [
      paid({ amount: 10, fee_code: "mensualidad", billing_month: 10 }),
      paid({ amount: 15, fee_code: "mensualidad", billing_month: 10 }),
    ]);
    expect(result.find((o) => o.key === "mensualidad:10")?.remaining).toBe(0);
  });

  it("does not let an overpayment go negative", () => {
    const result = obligations("base", [
      paid({ amount: 40, fee_code: "mensualidad", billing_month: 10 }),
    ]);
    expect(result.find((o) => o.key === "mensualidad:10")?.remaining).toBe(0);
  });

  it("does not close any month with an old monthly payment without month", () => {
    const result = obligations("base", [paid({ amount: 25, fee_code: null })]);
    expect(result.find((o) => o.key === "mensualidad:10")?.remaining).toBe(25);
  });

  it("ignores payments that are not paid", () => {
    const result = obligations("base", [
      { amount: 75, status: "pending", fee_code: "matricula", billing_month: null },
    ]);
    expect(result.find((o) => o.key === "matricula")?.remaining).toBe(75);
  });

  it("closes matrícula with a single payment", () => {
    const result = obligations("base", [paid({ amount: 75, fee_code: "matricula" })]);
    expect(result.find((o) => o.key === "matricula")?.remaining).toBe(0);
  });

  it("keeps a once fee not overdue before its due date", () => {
    const result = computeObligations({
      season: SEASON,
      audience: "base",
      paysExtendedMonthly: false,
      lines: [
        line({
          audience: "base",
          code: "matricula",
          label: "Matrícula",
          kind: "once",
          amount: 75,
          due_date: "2026-11-01",
        }),
      ],
      payments: [],
      today: TODAY,
    });
    expect(result.find((o) => o.key === "matricula")?.overdue).toBe(false);
  });

  it("marks a once fee overdue after its due date", () => {
    const result = computeObligations({
      season: SEASON,
      audience: "base",
      paysExtendedMonthly: false,
      lines: [
        line({
          audience: "base",
          code: "matricula",
          label: "Matrícula",
          kind: "once",
          amount: 75,
          due_date: "2026-10-01",
        }),
      ],
      payments: [],
      today: TODAY,
    });
    expect(result.find((o) => o.key === "matricula")?.overdue).toBe(true);
  });
});

describe("computeObligations — senior and aficionados", () => {
  it("senior owes matrícula, single payment and January–March fees", () => {
    const result = obligations("senior");
    expect(result.filter((o) => o.kind === "once").map((o) => o.code)).toEqual([
      "matricula",
      "pago_unico",
    ]);
    expect(
      result.filter((o) => o.kind === "monthly").map((o) => o.month),
    ).toEqual([1, 2, 3]);
    expect(result.find((o) => o.code === "pago_unico")?.due).toBe(90);
  });

  it("aficionados has no monthly fees", () => {
    const result = obligations("aficionados");
    expect(result.every((o) => o.kind === "once")).toBe(true);
    expect(result.map((o) => o.code)).toEqual(["matricula", "pago_unico"]);
  });

  it("one-off concepts are overdue from the start of the season", () => {
    expect(obligations("senior").filter((o) => o.kind === "once").every((o) => o.overdue)).toBe(
      true,
    );
  });
});

describe("summarizeObligations", () => {
  it("separates overdue concepts from upcoming months", () => {
    const summary = summarizeObligations(obligations("base"));
    expect(summary.hasOverdue).toBe(true);
    expect(summary.overdueOnce.map((o) => o.code)).toEqual(["matricula"]);
    expect(summary.overdueMonthly[0]?.months).toEqual([10]);
    expect(summary.upcomingMonthly[0]?.months).toEqual([11, 12, 1, 2, 3, 4, 5, 6]);
  });

  it("reports no overdue items when everything due is paid", () => {
    const summary = summarizeObligations(
      obligations("base", [
        paid({ amount: 75, fee_code: "matricula" }),
        paid({ amount: 25, fee_code: "mensualidad", billing_month: 10 }),
      ]),
    );
    expect(summary.hasOverdue).toBe(false);
    expect(summary.hasUpcoming).toBe(true);
  });
});

describe("unassignedPaidPayments", () => {
  it("counts payments without fee_code and monthly fees without month", () => {
    const result = unassignedPaidPayments(
      [
        paid({ amount: 25 }),
        paid({ amount: 25, fee_code: "mensualidad", billing_month: null }),
        paid({ amount: 25, fee_code: "mensualidad", billing_month: 10 }),
        paid({ amount: 75, fee_code: "matricula" }),
      ],
      LINES,
    );
    expect(result).toEqual({ count: 2, total: 50 });
  });
});

describe("formatMonthGroup", () => {
  it("compresses a consecutive run with the total", () => {
    expect(formatMonthGroup([10, 11, 12, 1, 2, 3, 4, 5, 6])).toBe("Oct–Jun · 9");
  });

  it("lists short groups and non-consecutive months", () => {
    expect(formatMonthGroup([10])).toBe("Oct");
    expect(formatMonthGroup([10, 11])).toBe("Oct, Nov · 2");
    expect(formatMonthGroup([10, 12])).toBe("Oct, Dic · 2");
  });
});

describe("obligationConcept", () => {
  it("writes the month in lowercase for monthly fees", () => {
    expect(obligationConcept({ label: "Cuota mensual", month: 10 })).toBe(
      "Cuota mensual — octubre",
    );
    expect(obligationConcept({ label: "Matrícula", month: null })).toBe("Matrícula");
  });
});
