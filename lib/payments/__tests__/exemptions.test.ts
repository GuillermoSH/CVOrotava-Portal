import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildPaymentsDashboard } from "@/lib/payments/dashboard-stats";
import { buildPlayerFeeRows, type PaymentPlayer } from "@/lib/payments/player-fee-rows";
import { listOwing, planReminders } from "@/lib/payments/reminders/plan";
import { isMissingTableError, listExemptPlayerIds } from "@/lib/payments/repository/exemptions";
import type { SeasonFeeLine } from "@/lib/types/db";

const season = "2026-27";
const today = new Date(2026, 10, 10); // 10 nov 2026: octubre atrasado, noviembre vencido

const lines = [
  {
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
  } as SeasonFeeLine,
];

const player = (id: string): PaymentPlayer => ({
  id,
  full_name: `Jugador ${id}`,
  pays_extended_monthly: false,
  team: { name: "Cadete", category: "cadete" },
});

const paidOctober = {
  id: "p1",
  amount: 25,
  status: "paid",
  fee_code: "mensualidad",
  billing_month: 10,
  method: "efectivo",
  paid_date: "2026-11-03",
};

function rows(exempt: string[]) {
  return buildPlayerFeeRows({
    players: [player("a"), player("b")],
    lines,
    paymentsByPlayer: new Map([["b", [paidOctober]]]),
    season,
    today,
    exemptPlayerIds: new Set(exempt),
  });
}

describe("jugadores exentos en las filas de pagos", () => {
  it("un exento no tiene obligaciones y queda marcado", () => {
    const [a, b] = rows(["a"]);
    expect(a.exempt).toBe(true);
    expect(a.obligations).toEqual([]);
    expect(b.exempt).toBe(false);
    expect(b.obligations.length).toBeGreaterThan(0);
  });

  it("sin exentos todo sigue igual", () => {
    const [a] = rows([]);
    expect(a.exempt).toBe(false);
    expect(a.obligations.length).toBeGreaterThan(0);
  });

  it("conserva los cobros ya anotados del exento", () => {
    const [, b] = rows(["b"]);
    expect(b.exempt).toBe(true);
    expect(b.obligations).toEqual([]);
    expect(b.payments).toHaveLength(1);
  });

  it("no recibe avisos por correo ni sale en la lista de morosos", () => {
    const withExempt = rows(["a"]);
    expect(planReminders({ rows: withExempt, today, history: [] }).map((p) => p.playerId)).toEqual([
      "b",
    ]);
    expect(listOwing({ rows: withExempt }).map((p) => p.playerId)).toEqual(["b"]);
  });

  it("el inicio no lo cuenta como moroso pero sí suma lo que cobró", () => {
    const dash = buildPaymentsDashboard({ rows: rows(["a", "b"]), lines, today });
    expect(dash.overduePlayers).toBe(0);
    expect(dash.debtors).toEqual([]);
    expect(dash.seasonTotal).toBe(25);
  });
});

describe("listExemptPlayerIds", () => {
  const db = (result: { data?: unknown; error?: unknown }) =>
    ({
      from: () => ({ select: () => ({ eq: () => Promise.resolve(result) }) }),
    }) as never;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("devuelve los ids de la temporada", async () => {
    const ids = await listExemptPlayerIds(
      db({ data: [{ player_id: "a" }, { player_id: "b" }], error: null }),
      season,
    );
    expect([...ids]).toEqual(["a", "b"]);
  });

  it("si la tabla no existe, es «sin exentos» y avisa en el log", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ids = await listExemptPlayerIds(
      db({ data: null, error: { code: "42P01", message: "relation does not exist" } }),
      season,
    );
    expect(ids.size).toBe(0);
    expect(warn).toHaveBeenCalled();
  });

  it("otro error de base de datos no se traga", async () => {
    await expect(
      listExemptPlayerIds(db({ data: null, error: { code: "XX000", message: "boom" } }), season),
    ).rejects.toThrow("payment_exemptions: boom");
  });

  it("reconoce los dos códigos de tabla inexistente", () => {
    expect(isMissingTableError({ code: "42P01" })).toBe(true);
    expect(isMissingTableError({ code: "PGRST205" })).toBe(true);
    expect(isMissingTableError({ code: "23505", message: "duplicate" })).toBe(false);
    expect(isMissingTableError(null)).toBe(false);
  });
});
