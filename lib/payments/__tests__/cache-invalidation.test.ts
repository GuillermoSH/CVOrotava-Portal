import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();
const revalidatePath = vi.fn();
const cacheTag = vi.fn();
const cacheLife = vi.fn();

vi.mock("next/cache", () => ({
  updateTag: (...args: unknown[]) => updateTag(...args),
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
  cacheTag: (...args: unknown[]) => cacheTag(...args),
  cacheLife: (...args: unknown[]) => cacheLife(...args),
}));

const listPlayerIdsWithPaidMatricula = vi.fn();
const listSeasonPaymentFacts = vi.fn();
const listPlayersForPayments = vi.fn();
const listExemptPlayerIds = vi.fn();

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({}),
}));

vi.mock("@/lib/payments/repository/payments", () => ({
  listPlayerIdsWithPaidMatricula: (...args: unknown[]) => listPlayerIdsWithPaidMatricula(...args),
  listSeasonPaymentFacts: (...args: unknown[]) => listSeasonPaymentFacts(...args),
}));

vi.mock("@/lib/payments/repository/exemptions", () => ({
  listExemptPlayerIds: (...args: unknown[]) => listExemptPlayerIds(...args),
}));

vi.mock("@/lib/payments/repository/players", () => ({
  listPlayersForPayments: (...args: unknown[]) => listPlayersForPayments(...args),
}));

import { paymentsTag, rosterSeasonTag } from "@/lib/cache/tags";
import { invalidatePayments } from "@/lib/cache/invalidate";
import {
  getCachedExemptPlayerIds,
  getCachedPaidMatriculaIds,
  getCachedPaymentPlayers,
  getCachedSeasonPaymentFacts,
} from "@/lib/payments/cached-payments";

beforeEach(() => {
  vi.clearAllMocks();
  listExemptPlayerIds.mockResolvedValue(new Set());
});

describe("invalidatePayments", () => {
  it("expires the payments tag and refreshes both screens that read it", () => {
    invalidatePayments();
    expect(updateTag).toHaveBeenCalledWith(paymentsTag());
    expect(revalidatePath).toHaveBeenCalledWith("/admin/pagos", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/jugadores", "layout");
  });
});

describe("cached payment reads", () => {
  it("tags the matrícula set with the payments tag", async () => {
    listPlayerIdsWithPaidMatricula.mockResolvedValue(new Set(["a", "b"]));
    await expect(getCachedPaidMatriculaIds("2026-27")).resolves.toEqual(["a", "b"]);
    expect(cacheTag).toHaveBeenCalledWith(paymentsTag());
    expect(listPlayerIdsWithPaidMatricula).toHaveBeenCalledWith({}, "2026-27");
  });

  it("cuenta a los exentos como matrícula resuelta, sin duplicar", async () => {
    listPlayerIdsWithPaidMatricula.mockResolvedValue(new Set(["a", "b"]));
    listExemptPlayerIds.mockResolvedValue(new Set(["b", "c"]));
    await expect(getCachedPaidMatriculaIds("2026-27")).resolves.toEqual(["a", "b", "c"]);
    expect(listExemptPlayerIds).toHaveBeenCalledWith({}, "2026-27");
  });

  it("tags the exempt ids with the payments tag", async () => {
    listExemptPlayerIds.mockResolvedValue(new Set(["x"]));
    await expect(getCachedExemptPlayerIds("2026-27")).resolves.toEqual(["x"]);
    expect(cacheTag).toHaveBeenCalledWith(paymentsTag());
  });

  it("returns season payments as serializable entries", async () => {
    const facts = [
      {
        id: "x",
        player_id: "a",
        amount: 25,
        status: "paid",
        method: "efectivo",
        paid_date: "2026-10-13",
        fee_code: "mensualidad",
        billing_month: 10,
      },
    ];
    listSeasonPaymentFacts.mockResolvedValue(new Map([["a", facts]]));

    const entries = await getCachedSeasonPaymentFacts("2026-27");
    expect(entries).toEqual([["a", facts]]);
    expect(new Map(entries).get("a")).toEqual(facts);
    expect(cacheTag).toHaveBeenCalledWith(paymentsTag());
  });

  it("tags the payment players with the roster season so player edits refresh it", async () => {
    listPlayersForPayments.mockResolvedValue([]);
    await getCachedPaymentPlayers("2026-27");
    expect(cacheTag).toHaveBeenCalledWith(rosterSeasonTag("2026-27"));
  });
});
