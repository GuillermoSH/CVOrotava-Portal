import { describe, expect, it } from "vitest";

import { buildPaymentsDashboard } from "@/lib/payments/dashboard-stats";
import { buildPlayerFeeRows, type PaymentPlayer } from "@/lib/payments/player-fee-rows";
import type { SeasonFeeLine } from "@/lib/types/db";

const season = "2026-27";
const today = new Date(2026, 10, 15); // 15 nov 2026: octubre y noviembre vencidos

const line = (over: Partial<SeasonFeeLine>): SeasonFeeLine =>
  ({
    id: "l",
    season,
    audience: "base",
    code: "mensualidad",
    label: "Cuota mensual",
    kind: "monthly",
    amount: 25,
    amount_extended: null,
    months: [10, 11, 12],
    due_date: null,
    sort_order: 1,
    ...over,
  }) as SeasonFeeLine;

const lines = [
  line({}),
  line({ id: "m", code: "matricula", label: "Matrícula", kind: "once", amount: 75, months: [] }),
];

const player = (id: string, name: string): PaymentPlayer => ({
  id,
  full_name: name,
  pays_extended_monthly: false,
  team: { name: "Cadete", category: "cadete" },
});

const paid = (id: string, over: Record<string, unknown>) => ({
  id,
  amount: 25,
  status: "paid",
  fee_code: "mensualidad",
  billing_month: 10,
  method: "efectivo",
  paid_date: "2026-11-03",
  ...over,
});

describe("buildPaymentsDashboard", () => {
  const rows = buildPlayerFeeRows({
    players: [player("a", "Ana"), player("b", "Bea"), player("c", "Cris")],
    lines,
    paymentsByPlayer: new Map([
      // Ana: al día con matrícula y oct+nov
      [
        "a",
        [
          paid("p1", { amount: 75, fee_code: "matricula", billing_month: null, paid_date: "2026-10-01" }),
          paid("p2", { billing_month: 10, paid_date: "2026-10-05" }),
          paid("p3", { billing_month: 11, paid_date: "2026-11-03" }),
        ],
      ],
      // Bea: solo octubre → debe matrícula y noviembre
      ["b", [paid("p4", { billing_month: 10, method: "transferencia", paid_date: "2026-11-10" })]],
    ]),
    season,
    today,
  });

  const stats = buildPaymentsDashboard({ rows, lines, today });

  it("suma lo cobrado en la temporada y en el mes natural", () => {
    expect(stats.seasonTotal).toBe(75 + 25 + 25 + 25);
    expect(stats.monthTotal).toBe(25 + 25);
  });

  it("cuenta las cuotas del mes corriente cerradas frente a las que tocan", () => {
    expect(stats.monthly).toEqual({ month: 11, paid: 1, target: 3 });
  });

  it("marca morosos críticos con algún pago atrasado (mes ya terminado), no solo vencido", () => {
    // Cris: matrícula 75 + oct 25 atrasadas (nov solo vencida el día 10) = 2 / 100.
    // Bea: matrícula atrasada (75) + nov solo vencida → 1 atrasada / 75.
    expect(stats.debtors.map((d) => [d.name, d.lateCount, d.balance])).toEqual([
      ["Cris", 2, 100],
      ["Bea", 1, 75],
    ]);
    expect(stats.overduePlayers).toBe(2);
    expect(stats.overdueTotal).toBe(225);
  });

  it("ordena los últimos cobros por fecha y rotula el concepto", () => {
    expect(stats.recent[0]).toMatchObject({
      playerName: "Bea",
      concept: "Cuota mensual — octubre",
      method: "transferencia",
    });
    expect(stats.recent).toHaveLength(4);
  });

  it("una baja conserva sus cobros pero no genera deuda", () => {
    const baja = buildPlayerFeeRows({
      players: [{ ...player("z", "Zoe"), is_active: false }],
      lines,
      paymentsByPlayer: new Map([["z", [paid("p9", { amount: 25, billing_month: 10 })]]]),
      season,
      today,
    });
    const s = buildPaymentsDashboard({ rows: baja, lines, today });
    expect(s.seasonTotal).toBe(25);
    expect(s.overdueTotal).toBe(0);
    expect(s.debtors).toEqual([]);
  });

  it("sin cuotas este mes devuelve monthly null", () => {
    const empty = buildPaymentsDashboard({ rows: [], lines, today });
    expect(empty.monthly).toBeNull();
    expect(empty.seasonTotal).toBe(0);
  });
});
