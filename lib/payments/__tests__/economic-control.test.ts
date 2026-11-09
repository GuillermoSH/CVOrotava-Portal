import { describe, expect, it } from "vitest";

import { buildEconomicControl, suggestAnnul, type PaymentDetail } from "@/lib/payments/economic-control";
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
    months: [10, 11],
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
  paid_date: "2026-10-05",
  ...over,
});

const rows = buildPlayerFeeRows({
  players: [player("a", "Ana"), player("b", "Bea"), player("c", "Cris")],
  lines,
  paymentsByPlayer: new Map([
    // Ana: todo pagado, y la matrícula dos veces → 75 de más
    [
      "a",
      [
        paid("a1", { amount: 75, fee_code: "matricula", billing_month: null }),
        paid("a2", { amount: 75, fee_code: "matricula", billing_month: null, paid_date: "2026-10-20" }),
        paid("a3", { billing_month: 10 }),
        paid("a4", { billing_month: 11 }),
      ],
    ],
    // Bea: matrícula pagada, octubre pagado; noviembre debe. Un cobro libre de 25 € repite octubre.
    [
      "b",
      [
        paid("b1", { amount: 75, fee_code: "matricula", billing_month: null }),
        paid("b2", { billing_month: 10 }),
        paid("b3", { fee_code: null, billing_month: null, paid_date: "2026-10-01" }),
      ],
    ],
  ]),
  season,
  today,
});

const control = buildEconomicControl({ rows, lines });

describe("buildEconomicControl", () => {
  it("lista lo vencido por jugador con sus conceptos, atrasados primero", () => {
    // Cris lo debe todo (matrícula + oct + nov); Bea solo noviembre (vencido, no atrasado)
    expect(control.overdue.map((e) => e.name)).toEqual(["Cris", "Bea"]);
    expect(control.overdue[0].total).toBe(75 + 25 + 25);
    expect(control.overdue[0].hasLate).toBe(true);
    expect(control.overdue[1].concepts).toEqual([
      { label: "Cuota mensual — noviembre", remaining: 25, late: false },
    ]);
    expect(control.overdueTotal).toBe(125 + 25);
  });

  it("matrícula pendiente solo de quien no la ha pagado", () => {
    expect(control.matricula.map((e) => e.name)).toEqual(["Cris"]);
    expect(control.matriculaTotal).toBe(75);
  });

  it("cobrado de más separa los cobros que suman el concepto", () => {
    expect(control.overpaid).toHaveLength(1);
    expect(control.overpaid[0]).toMatchObject({ name: "Ana", concept: "Matrícula", excess: 75 });
    expect(control.overpaid[0].payments.map((p) => p.id)).toEqual(["a1", "a2"]);
    expect(control.overpaidTotal).toBe(75);
  });

  it("cobros sin concepto indican el gemelo con concepto del mismo importe", () => {
    expect(control.unassigned).toHaveLength(1);
    const [free] = control.unassigned;
    expect(free.payment.id).toBe("b3");
    expect(free.twins.map((t) => t.concept)).toEqual(["Cuota mensual — octubre"]);
    expect(free.verdict).toBe("repeat");
    expect(control.unassignedTotal).toBe(25);
  });

  it("un cobro libre que no repite nada y cubre una deuda abierta se puede asignar", () => {
    const only = buildPlayerFeeRows({
      players: [player("d", "Dani")],
      lines,
      paymentsByPlayer: new Map([
        ["d", [paid("d1", { fee_code: null, billing_month: null, amount: 75 })]],
      ]),
      season,
      today,
    });
    const [free] = buildEconomicControl({ rows: only, lines }).unassigned;
    expect(free.verdict).toBe("assign");
    expect(free.assignTargets.map((t) => t.label)).toEqual(["Matrícula"]);
  });

  it("sin gemelo ni deuda que encaje, el cobro libre queda para revisar", () => {
    const only = buildPlayerFeeRows({
      players: [player("e", "Eva")],
      lines,
      paymentsByPlayer: new Map([["e", [paid("e1", { fee_code: null, billing_month: null, amount: 13 })]]]),
      season,
      today,
    });
    expect(buildEconomicControl({ rows: only, lines }).unassigned[0].verdict).toBe("review");
  });
});

describe("suggestAnnul", () => {
  const [entry] = control.overpaid;
  const detail = (id: string, createdAt: string): [string, PaymentDetail] => [
    id,
    { id, concept: "Matrícula", notes: null, createdAt },
  ];

  it("sugiere el último cobro anotado entre los de importe repetido", () => {
    const details = new Map([detail("a1", "2026-10-01T10:00:00Z"), detail("a2", "2026-10-20T10:00:00Z")]);
    expect(suggestAnnul(entry, details)).toBe("a2");
  });

  it("no sugiere nada si el cobro de más es un único importe superior", () => {
    const single = { due: 25, paid: 30, payments: [{ id: "x", amount: 30, date: null, method: null, code: "m", month: 10 }] };
    expect(suggestAnnul(single, new Map())).toBeNull();
  });
});
