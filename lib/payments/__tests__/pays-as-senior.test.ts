import { describe, expect, it } from "vitest";

import { buildPlayerFeeRows, type PaymentPlayer } from "@/lib/payments/player-fee-rows";
import type { SeasonFeeLine } from "@/lib/types/db";

const season = "2026-27";
const today = new Date(2026, 10, 12);

function line(partial: Partial<SeasonFeeLine>): SeasonFeeLine {
  return {
    id: `${partial.audience}-${partial.code}`,
    season,
    amount_extended: null,
    months: [],
    due_date: null,
    sort_order: 1,
    ...partial,
  } as SeasonFeeLine;
}

const lines = [
  line({ audience: "base", code: "mensualidad", label: "Cuota mensual", kind: "monthly", amount: 25, months: [10, 11] }),
  line({ audience: "base", code: "matricula", label: "Matrícula", kind: "once", amount: 75, sort_order: 2 }),
  line({ audience: "base", code: "equipacion", label: "Equipación", kind: "once", amount: 15, sort_order: 3 }),
  line({ audience: "senior", code: "mensualidad", label: "Cuota mensual", kind: "monthly", amount: 35, months: [10, 11] }),
  line({ audience: "senior", code: "matricula", label: "Matrícula", kind: "once", amount: 75, sort_order: 2 }),
];

const junior = (extra: Partial<PaymentPlayer> = {}): PaymentPlayer => ({
  id: "j",
  full_name: "Junior Uno",
  pays_extended_monthly: false,
  team: { name: "Júnior", category: "junior" },
  ...extra,
});

const paidMatricula = {
  id: "p1",
  amount: 75,
  status: "paid",
  fee_code: "matricula",
  billing_month: null,
  method: "transferencia",
  paid_date: "2026-09-20",
};

function build(player: PaymentPlayer, payments = [paidMatricula]) {
  return buildPlayerFeeRows({
    players: [player],
    lines,
    paymentsByPlayer: new Map([[player.id, payments]]),
    season,
    today,
  })[0];
}

describe("jugador de base que paga como sénior", () => {
  it("sin la casilla usa la tarifa de base", () => {
    const row = build(junior());
    expect(row.audience).toBe("base");
    expect(row.obligations.find((o) => o.key === "mensualidad:10")?.due).toBe(25);
    expect(row.obligations.some((o) => o.code === "equipacion")).toBe(true);
  });

  it("con la casilla usa la tarifa sénior y deja de exigir la equipación de base", () => {
    const row = build(junior({ pays_as_senior: true }));
    expect(row.audience).toBe("senior");
    expect(row.obligations.find((o) => o.key === "mensualidad:10")?.due).toBe(35);
    expect(row.obligations.some((o) => o.code === "equipacion")).toBe(false);
  });

  it("la matrícula ya cobrada sigue contando (mismo concepto en ambos colectivos)", () => {
    const row = build(junior({ pays_as_senior: true }));
    const matricula = row.obligations.find((o) => o.code === "matricula");
    expect(matricula?.paid).toBe(75);
    expect(matricula?.remaining).toBe(0);
  });

  it("la casilla no cambia nada en un sénior ni en aficionados", () => {
    const senior = build(
      junior({ pays_as_senior: true, team: { name: "Sénior", category: "senior" } }),
    );
    expect(senior.audience).toBe("senior");
    expect(senior.obligations.find((o) => o.key === "mensualidad:10")?.due).toBe(35);
  });
});
