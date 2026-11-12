import { describe, expect, it } from "vitest";

import {
  matchPlannedToStock,
  plannedIdsFulfilledBy,
  validatePlannedRows,
} from "@/lib/clothing/plannedDeliveries";
import type { StockPool } from "@/lib/clothing/stockSources";
import type { ClothingPlannedDelivery } from "@/lib/types/db";

const SHIRT = "11111111-1111-4111-8111-111111111111";
const SOCKS = "22222222-2222-4222-8222-222222222222";
const ANA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LUIS = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const row = (player_id: string, product_id: string, size: "m" | "l", jersey_number: number | null = null) => ({
  player_id,
  product_id,
  size,
  jersey_number,
});

const planned = (
  id: string,
  product_id: string,
  size: "m" | "l",
  jersey_number: number | null = null,
): ClothingPlannedDelivery => ({
  id,
  order_id: "order",
  player_id: ANA,
  product_id,
  size,
  jersey_number,
  delivered_at: null,
  created_at: "2026-11-12T00:00:00Z",
});

const pool = (
  productId: string,
  size: "m" | "l",
  quantity: number,
  jerseyNumber: number | null = null,
  storageLocationId: string | null = null,
): StockPool => ({
  productId,
  size,
  storageLocationId,
  jerseyNumber,
  box: null,
  home: "Por ubicar",
  quantity,
  lots: [],
});

describe("validatePlannedRows", () => {
  const lines = [
    { product_id: SHIRT, size: "m" as const, quantity_ordered: 2 },
    { product_id: SOCKS, size: "l" as const, quantity_ordered: 1 },
  ];

  it("acepta asignar hasta lo pedido", () => {
    expect(validatePlannedRows([row(ANA, SHIRT, "m", 7), row(LUIS, SHIRT, "m", 9)], lines)).toBeNull();
  });

  it("rechaza asignar más de lo pedido", () => {
    const rows = [row(ANA, SOCKS, "l"), row(LUIS, SOCKS, "l")];
    expect(validatePlannedRows(rows, lines)).toMatch(/más unidades asignadas/);
  });

  it("cuenta lo ya entregado como asignado", () => {
    const rows = [row(ANA, SHIRT, "m"), row(LUIS, SHIRT, "m")];
    expect(validatePlannedRows(rows, lines, [{ product_id: SHIRT, size: "m" }])).toMatch(/más unidades/);
  });

  it("rechaza una prenda o talla que no está en el pedido", () => {
    expect(validatePlannedRows([row(ANA, SHIRT, "l")], lines)).toMatch(/no está en el pedido/);
  });

  it("no deja repetir un dorsal en la misma prenda", () => {
    const rows = [row(ANA, SHIRT, "m", 7), row(LUIS, SHIRT, "m", 7)];
    expect(validatePlannedRows(rows, lines)).toMatch(/dorsal 7/);
  });
});

describe("matchPlannedToStock", () => {
  it("encuentra la prenda en stock con su dorsal", () => {
    const [match] = matchPlannedToStock([planned("p1", SHIRT, "m", 7)], [pool(SHIRT, "m", 1, 7)]);
    expect(match.pool?.jerseyNumber).toBe(7);
  });

  it("una prevista con dorsal no coge una prenda sin dorsal ni con otro", () => {
    const pools = [pool(SHIRT, "m", 3), pool(SHIRT, "m", 1, 9)];
    expect(matchPlannedToStock([planned("p1", SHIRT, "m", 7)], pools)[0].pool).toBeNull();
  });

  it("una prevista sin dorsal solo coge stock sin dorsal", () => {
    const pools = [pool(SHIRT, "m", 1, 9)];
    expect(matchPlannedToStock([planned("p1", SHIRT, "m")], pools)[0].pool).toBeNull();
  });

  it("no reserva dos veces la misma unidad", () => {
    const matches = matchPlannedToStock(
      [planned("p1", SOCKS, "l"), planned("p2", SOCKS, "l")],
      [pool(SOCKS, "l", 1)],
    );
    expect(matches.map((m) => m.pool !== null)).toEqual([true, false]);
  });

  it("usa otro montón si el primero se agota", () => {
    const matches = matchPlannedToStock(
      [planned("p1", SOCKS, "l"), planned("p2", SOCKS, "l")],
      [pool(SOCKS, "l", 1, null, "box-a"), pool(SOCKS, "l", 1, null, "box-b")],
    );
    expect(matches.map((m) => m.pool?.storageLocationId)).toEqual(["box-a", "box-b"]);
  });
});

describe("plannedIdsFulfilledBy", () => {
  it("cierra la prevista que coincide en prenda, talla y dorsal", () => {
    const pending = [planned("p1", SHIRT, "m", 7), planned("p2", SOCKS, "l")];
    const ids = plannedIdsFulfilledBy(pending, [
      { product_id: SHIRT, size: "m", jersey_number: 7, quantity: 1 },
    ]);
    expect(ids).toEqual(["p1"]);
  });

  it("entregar un dorsal distinto no cierra la prevista con dorsal", () => {
    const ids = plannedIdsFulfilledBy([planned("p1", SHIRT, "m", 7)], [
      { product_id: SHIRT, size: "m", jersey_number: 9, quantity: 1 },
    ]);
    expect(ids).toEqual([]);
  });

  it("una prevista sin dorsal se da por cumplida con una unidad con dorsal", () => {
    const ids = plannedIdsFulfilledBy([planned("p1", SHIRT, "m")], [
      { product_id: SHIRT, size: "m", jersey_number: 12, quantity: 1 },
    ]);
    expect(ids).toEqual(["p1"]);
  });

  it("cierra tantas previstas iguales como unidades se entregan, no más", () => {
    const pending = [planned("p1", SOCKS, "l"), planned("p2", SOCKS, "l"), planned("p3", SOCKS, "l")];
    const ids = plannedIdsFulfilledBy(pending, [
      { product_id: SOCKS, size: "l", jersey_number: null, quantity: 2 },
    ]);
    expect(ids).toEqual(["p1", "p2"]);
  });

  it("las unidades con dorsal exacto tienen prioridad sobre las previstas sin dorsal", () => {
    const pending = [planned("sin", SHIRT, "m"), planned("con", SHIRT, "m", 7)];
    const ids = plannedIdsFulfilledBy(pending, [
      { product_id: SHIRT, size: "m", jersey_number: 7, quantity: 1 },
    ]);
    expect(ids).toEqual(["con"]);
  });
});
