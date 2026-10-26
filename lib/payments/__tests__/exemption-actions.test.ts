import { beforeEach, describe, expect, it, vi } from "vitest";

const invalidatePayments = vi.fn();
const requirePaymentsWriteAccess = vi.fn();
const requireRosterAdminAccess = vi.fn();
const listExemptPlayerIds = vi.fn();
const setExemption = vi.fn();
const removeExemption = vi.fn();
const createPayment = vi.fn();
const createPayments = vi.fn();
const getPlayerById = vi.fn();
const listPlayerUserIds = vi.fn();

vi.mock("@/lib/cache/invalidate", () => ({ invalidatePayments: () => invalidatePayments() }));
vi.mock("@/lib/payments/auth", () => ({
  requirePaymentsWriteAccess: () => requirePaymentsWriteAccess(),
}));
vi.mock("@/lib/roster/auth", () => ({
  requireRosterAdminAccess: () => requireRosterAdminAccess(),
}));
vi.mock("@/lib/payments/repository/client", () => ({ getPaymentsDb: async () => ({}) }));
vi.mock("@/lib/roster/repository/client", () => ({ getRosterDb: async () => ({}) }));
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } }),
}));
vi.mock("@/lib/payments/repository/exemptions", () => ({
  listExemptPlayerIds: (...args: unknown[]) => listExemptPlayerIds(...args),
  setExemption: (...args: unknown[]) => setExemption(...args),
  removeExemption: (...args: unknown[]) => removeExemption(...args),
}));
vi.mock("@/lib/payments/repository/payments", () => ({
  createPayment: (...args: unknown[]) => createPayment(...args),
  createPayments: (...args: unknown[]) => createPayments(...args),
}));
vi.mock("@/lib/roster/repository/players", () => ({
  getPlayerById: (...args: unknown[]) => getPlayerById(...args),
  listPlayerUserIds: (...args: unknown[]) => listPlayerUserIds(...args),
}));

import {
  removePlayerExemptionAction,
  setPlayerExemptionAction,
} from "@/lib/actions/payments/exemptions";
import {
  registerBulkPaymentsAction,
  registerPaymentAction,
} from "@/lib/actions/payments/register";
import { EXEMPT_PLAYER_ERROR } from "@/lib/payments/constants";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

const payment = {
  player_id: A,
  concept: "Cuota mensual",
  amount: 25,
  paid_date: "2026-11-03",
  method: "efectivo",
};

beforeEach(() => {
  vi.clearAllMocks();
  listExemptPlayerIds.mockResolvedValue(new Set());
  getPlayerById.mockResolvedValue({ id: A, user_id: null, season: "2026-27" });
  createPayment.mockResolvedValue({ id: "pay1" });
  createPayments.mockImplementation(async (_db, list: unknown[]) => list);
});

describe("registrar cobro a un exento", () => {
  it("lo bloquea y no crea nada", async () => {
    listExemptPlayerIds.mockResolvedValue(new Set([A]));
    const result = await registerPaymentAction(payment);
    expect(result).toEqual({ ok: false, error: EXEMPT_PLAYER_ERROR });
    expect(createPayment).not.toHaveBeenCalled();
    expect(invalidatePayments).not.toHaveBeenCalled();
  });

  it("deja registrar a quien no es exento", async () => {
    const result = await registerPaymentAction(payment);
    expect(result).toEqual({ ok: true, id: "pay1" });
    expect(createPayment).toHaveBeenCalledTimes(1);
  });

  it("en bloque, rechaza todo el lote si alguno es exento", async () => {
    listPlayerUserIds.mockResolvedValue([
      { id: A, user_id: null },
      { id: B, user_id: null },
    ]);
    listExemptPlayerIds.mockResolvedValue(new Set([B]));
    const result = await registerBulkPaymentsAction({
      entries: [
        { player_id: A, amount: 25 },
        { player_id: B, amount: 25 },
      ],
      concept: "Cuota mensual",
      paid_date: "2026-11-03",
      method: "efectivo",
    });
    expect(result).toEqual({ ok: false, error: EXEMPT_PLAYER_ERROR });
    expect(createPayments).not.toHaveBeenCalled();
  });

  it("en bloque, registra si ninguno es exento", async () => {
    listPlayerUserIds.mockResolvedValue([{ id: A, user_id: null }]);
    const result = await registerBulkPaymentsAction({
      entries: [{ player_id: A, amount: 25 }],
      concept: "Cuota mensual",
      paid_date: "2026-11-03",
      method: "efectivo",
    });
    expect(result).toEqual({ ok: true, created: 1 });
  });
});

describe("marcar y quitar la exención", () => {
  it("marca la exención en la temporada del jugador, con motivo recortado", async () => {
    const result = await setPlayerExemptionAction({ player_id: A, reason: "  Coordinación  " });
    expect(result).toEqual({ ok: true });
    expect(setExemption).toHaveBeenCalledWith(
      {},
      { playerId: A, season: "2026-27", reason: "Coordinación", createdBy: "u1" },
    );
    expect(invalidatePayments).toHaveBeenCalledTimes(1);
  });

  it("un motivo vacío se guarda como null", async () => {
    await setPlayerExemptionAction({ player_id: A, reason: "   " });
    expect(setExemption).toHaveBeenCalledWith({}, expect.objectContaining({ reason: null }));
  });

  it("rechaza ids no válidos y jugadores inexistentes", async () => {
    expect(await setPlayerExemptionAction({ player_id: "no-uuid" })).toMatchObject({ ok: false });
    getPlayerById.mockResolvedValue(null);
    expect(await setPlayerExemptionAction({ player_id: A })).toEqual({
      ok: false,
      error: "Jugador no encontrado",
    });
    expect(setExemption).not.toHaveBeenCalled();
  });

  it("solo el admin puede: si falla la autorización no se escribe", async () => {
    requireRosterAdminAccess.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    const result = await setPlayerExemptionAction({ player_id: A });
    expect(result.ok).toBe(false);
    expect(setExemption).not.toHaveBeenCalled();
  });

  it("quitar la exención desbloquea al jugador e invalida la caché", async () => {
    const result = await removePlayerExemptionAction({ player_id: A });
    expect(result).toEqual({ ok: true });
    expect(removeExemption).toHaveBeenCalledWith({}, A, "2026-27");
    expect(invalidatePayments).toHaveBeenCalledTimes(1);
  });
});
