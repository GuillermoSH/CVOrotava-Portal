import { describe, expect, it } from "vitest";

import {
  GARMENT_CATEGORIES,
  isGarmentCategory,
  parseJerseyNumber,
} from "@/lib/roster/garment-sizes";
import { updatePlayerSchema } from "@/lib/roster/schemas";

describe("tarjeta de equipación", () => {
  it("las prendas con talla son las del catálogo menos la mochila", () => {
    expect(GARMENT_CATEGORIES).toContain("sweatshirt");
    expect(GARMENT_CATEGORIES).not.toContain("backpack");
    expect(isGarmentCategory("backpack")).toBe(false);
    expect(isGarmentCategory("jacket")).toBe(true);
  });

  it("el dorsal es un entero de 0 a 99", () => {
    expect(parseJerseyNumber("7")).toBe(7);
    expect(parseJerseyNumber("07")).toBe(7);
    expect(parseJerseyNumber("0")).toBe(0);
    expect(parseJerseyNumber("")).toBeNull();
    expect(parseJerseyNumber("100")).toBeNull();
    expect(parseJerseyNumber("a1")).toBeNull();
  });

  it("el esquema acepta tallas de solo algunas prendas y rechaza dorsales fuera de rango", () => {
    const base = {
      id: "5bdde0d8-87d5-4dcc-8205-77d17f6de007",
      first_name: "Ana",
      last_name: "Pérez",
      birth_date: "2008-12-18",
      dni: "42293405Q",
      season: "2026-27",
      address_street_type: "calle",
      address_street: "Mayor",
      address_number: "1",
      address_postal_code: "38355",
      address_municipality: "Tacoronte",
      address_province: "Santa Cruz de Tenerife",
      contacts: [{ full_name: "Ana Pérez", relationship: "jugador", phone: "600000000", email: "a@b.es", is_primary: true }],
    };
    const ok = updatePlayerSchema.safeParse({ ...base, garment_sizes: { sweatshirt: "m" }, jersey_number: 7 });
    expect(ok.success, JSON.stringify(ok.error?.issues)).toBe(true);
    expect(updatePlayerSchema.safeParse({ ...base, jersey_number: 100 }).success).toBe(false);
    expect(updatePlayerSchema.safeParse({ ...base, garment_sizes: { backpack: "m" } }).success).toBe(false);
  });
});

describe("dorsal único por equipo", () => {
  it("avisa de quién lo lleva y no se guarda", async () => {
    const calls: Array<[string, unknown]> = [];
    const chain: Record<string, unknown> = {};
    const result = { data: [{ full_name: "Romén Gómez" }], error: null };
    for (const method of ["select", "eq", "limit", "neq"]) {
      chain[method] = (...args: unknown[]) => {
        calls.push([method, args]);
        return chain;
      };
    }
    chain.then = (resolve: (value: unknown) => void) => resolve(result);
    const db = { from: () => chain } as never;

    const { findJerseyConflict } = await import("@/lib/roster/repository/garment-sizes");
    const holder = await findJerseyConflict(db, {
      teamId: "t1",
      jerseyNumber: 5,
      excludePlayerId: "me",
    });
    expect(holder).toBe("Romén Gómez");
    // solo cuentan jugadores activos del mismo equipo, y nunca el propio jugador
    expect(calls).toContainEqual(["eq", ["is_active", true]]);
    expect(calls).toContainEqual(["eq", ["team_id", "t1"]]);
    expect(calls).toContainEqual(["neq", ["id", "me"]]);
  });
});
