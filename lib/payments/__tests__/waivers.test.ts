import { describe, expect, it } from "vitest";

import {
  computeObligations,
  openObligations,
  type FeePaymentLike,
  type FeeWaiverLike,
} from "@/lib/payments/fees";
import { buildRowCells, columnsProgress, type MatrixColumn } from "@/lib/payments/matrix";
import { buildPlayerFeeRows } from "@/lib/payments/player-fee-rows";
import type { SeasonFeeLine } from "@/lib/types/db";

const SEASON = "2026-27";
// 13 de octubre de 2026: octubre vencido, noviembre en adelante todavía no.
const TODAY = new Date(2026, 9, 13);

const LINES: SeasonFeeLine[] = [
  {
    id: "senior-mensualidad",
    season: SEASON,
    audience: "senior",
    code: "mensualidad",
    label: "Cuota mensual",
    kind: "monthly",
    amount: 30,
    amount_extended: null,
    months: [10, 11, 12],
    due_date: null,
    sort_order: 1,
  },
  {
    id: "senior-matricula",
    season: SEASON,
    audience: "senior",
    code: "matricula",
    label: "Matrícula",
    kind: "once",
    amount: 75,
    amount_extended: null,
    months: [],
    due_date: null,
    sort_order: 0,
  },
];

function paid(amount: number, fee_code: string, billing_month: number | null): FeePaymentLike {
  return { amount, status: "paid", fee_code, billing_month };
}

function compute(payments: FeePaymentLike[], waivers: FeeWaiverLike[] = []) {
  return computeObligations({
    season: SEASON,
    audience: "senior",
    paysExtendedMonthly: false,
    lines: LINES,
    payments,
    today: TODAY,
    waivers,
  });
}

const find = (list: ReturnType<typeof compute>, key: string) => list.find((o) => o.key === key);

describe("anulaciones de lo pendiente", () => {
  it("sin anulaciones todo queda como antes (waived 0)", () => {
    const o = find(compute([paid(25, "mensualidad", 10)]), "mensualidad:10");
    expect(o).toMatchObject({ due: 30, paid: 25, remaining: 5, waived: 0, waivedReason: null });
  });

  it("caso cuota 25→30: pagó 25 y se anulan los 5 que faltan, ya no sale pendiente", () => {
    const result = compute(
      [paid(25, "mensualidad", 10)],
      [{ fee_code: "mensualidad", billing_month: 10, amount: 5, reason: "Cambio de cuota" }],
    );
    const o = find(result, "mensualidad:10");
    expect(o).toMatchObject({ due: 25, paid: 25, remaining: 0, waived: 5 });
    expect(o?.waivedReason).toBe("Cambio de cuota");
    expect(openObligations(result).map((x) => x.key)).not.toContain("mensualidad:10");
  });

  it("la anulación solo afecta a su mes, no a los demás", () => {
    const result = compute([], [{ fee_code: "mensualidad", billing_month: 11, amount: 30 }]);
    expect(find(result, "mensualidad:11")).toMatchObject({ due: 0, remaining: 0, waived: 30 });
    expect(find(result, "mensualidad:10")).toMatchObject({ due: 30, remaining: 30, waived: 0 });
    expect(find(result, "mensualidad:12")).toMatchObject({ due: 30, remaining: 30, waived: 0 });
  });

  it("un concepto único se anula con billing_month 0", () => {
    const result = compute([], [{ fee_code: "matricula", billing_month: 0, amount: 75 }]);
    expect(find(result, "matricula")).toMatchObject({ due: 0, remaining: 0, waived: 75 });
  });

  it("anulación parcial: lo restante sigue pendiente", () => {
    const result = compute([], [{ fee_code: "mensualidad", billing_month: 10, amount: 10 }]);
    expect(find(result, "mensualidad:10")).toMatchObject({ due: 20, remaining: 20, waived: 10 });
  });

  it("no puede anular más que la tarifa", () => {
    const result = compute([], [{ fee_code: "mensualidad", billing_month: 10, amount: 999 }]);
    expect(find(result, "mensualidad:10")).toMatchObject({ due: 0, remaining: 0, waived: 30 });
  });

  it("es reversible: quitar la anulación devuelve el pendiente original", () => {
    const withWaiver = compute([], [{ fee_code: "mensualidad", billing_month: 10, amount: 30 }]);
    const without = compute([]);
    expect(find(withWaiver, "mensualidad:10")?.remaining).toBe(0);
    expect(find(without, "mensualidad:10")).toMatchObject({ due: 30, remaining: 30, waived: 0 });
  });

  it("no toca los cobros: lo pagado se mantiene aunque haya anulación", () => {
    const o = find(
      compute(
        [paid(10, "mensualidad", 10)],
        [{ fee_code: "mensualidad", billing_month: 10, amount: 20 }],
      ),
      "mensualidad:10",
    );
    expect(o).toMatchObject({ paid: 10, due: 10, remaining: 0, waived: 20 });
  });
});

describe("anulaciones en filas y matriz", () => {
  const player = {
    id: "p1",
    full_name: "Jugador de Prueba",
    pays_extended_monthly: false,
    team: { name: "Sénior M", category: "senior" },
  };

  function rows(waivers: FeeWaiverLike[]) {
    return buildPlayerFeeRows({
      players: [player],
      lines: LINES,
      paymentsByPlayer: new Map(),
      season: SEASON,
      today: TODAY,
      waiversByPlayer: new Map([["p1", waivers]]),
    });
  }

  it("las anulaciones del jugador llegan a sus obligaciones", () => {
    const [row] = rows([{ fee_code: "mensualidad", billing_month: 10, amount: 30 }]);
    expect(row.obligations.find((o) => o.key === "mensualidad:10")?.waived).toBe(30);
  });

  it("una celda anulada entera es «waived» y no cuenta ni como cobrada ni como pendiente", () => {
    const [row] = rows([{ fee_code: "mensualidad", billing_month: 10, amount: 30 }]);
    const columns: MatrixColumn[] = [
      { key: "mensualidad:10", code: "mensualidad", label: "Cuota mensual", kind: "monthly", month: 10 },
      { key: "mensualidad:11", code: "mensualidad", label: "Cuota mensual", kind: "monthly", month: 11 },
    ];
    const cells = buildRowCells(row, columns);
    expect(cells[0].kind).toBe("waived");
    expect(cells[1].kind).toBe("upcoming");
    expect(columnsProgress([cells], 2)).toEqual([
      { paid: 0, total: 0 },
      { paid: 0, total: 1 },
    ]);
  });
});
