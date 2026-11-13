import { describe, expect, it } from "vitest";

import { buildOrderNextStep } from "@/lib/clothing/orderNextStep";
import type {
  ClothingInventoryLotWithDetails,
  ClothingOrderLineWithProduct,
  ClothingProduct,
} from "@/lib/types/db";

const product = (category: ClothingProduct["category"]) => ({ category }) as ClothingProduct;

const line = (id: string, ordered: number, received: number): ClothingOrderLineWithProduct =>
  ({
    id,
    order_id: "o1",
    product_id: `p-${id}`,
    size: "m",
    quantity_ordered: ordered,
    quantity_received: received,
    created_at: "2026-11-01",
    product: product("shirt_competition"),
  }) as ClothingOrderLineWithProduct;

const lot = (
  id: string,
  patch: Partial<ClothingInventoryLotWithDetails> = {},
): ClothingInventoryLotWithDetails =>
  ({
    id,
    product_id: "p-a",
    size: "m",
    quantity: 2,
    status: "pending_storage",
    storage_location_id: null,
    source_order_id: "o1",
    source_line_id: "a",
    source_type: "order",
    notes: null,
    returned_from_serigraphy_at: null,
    jersey_number: null,
    created_at: "x",
    updated_at: "x",
    product: product("shirt_competition"),
    location_path: null,
    ...patch,
  }) as ClothingInventoryLotWithDetails;

const base = { orderId: "o1", plannedCount: 0 };

describe("buildOrderNextStep", () => {
  it("en borrador cuenta las unidades y las líneas", () => {
    const step = buildOrderNextStep({
      ...base,
      status: "draft",
      lines: [line("a", 2, 0), line("b", 1, 0)],
      lots: [],
    });
    expect(step.finding.text).toBe("3 uds en 2 líneas");
    expect(step.steps[0]?.done).toBe(true);
    expect(step.leadAction).toBeNull();
  });

  it("enviado: dice cuántas faltan y enlaza a las líneas", () => {
    const step = buildOrderNextStep({
      ...base,
      status: "ordered",
      lines: [line("a", 10, 4)],
      lots: [],
    });
    expect(step.finding).toEqual({ text: "Faltan 6 uds por recibir", tone: "warn" });
    expect(step.steps.every((s) => s.href === "#lineas")).toBe(true);
    expect(step.stockBlocker).toBeNull();
  });

  it("recepción completa en enviado", () => {
    const step = buildOrderNextStep({
      ...base,
      status: "ordered",
      lines: [line("a", 2, 2)],
      lots: [],
    });
    expect(step.finding).toEqual({ text: "Recepción completa", tone: "ok" });
  });

  it("vuelta de serigrafía: el primer paso pendiente es el botón principal", () => {
    const step = buildOrderNextStep({
      ...base,
      status: "returned_from_serigraphy",
      lines: [line("a", 2, 2)],
      lots: [lot("l1")],
    });
    expect(step.leadAction?.label).toBe("Numerar dorsales (1)");
    expect(step.finding.text).toBe("1 lote por ubicar · 1 dorsal por numerar");
  });

  it("con dorsales numerados lo siguiente es ubicar", () => {
    const step = buildOrderNextStep({
      ...base,
      status: "returned_from_serigraphy",
      lines: [line("a", 2, 2)],
      lots: [lot("l1", { jersey_number: 7, quantity: 1 }), lot("l2", { jersey_number: 9, quantity: 1 })],
    });
    expect(step.leadAction?.label).toBe("Ubicar lotes (2)");
    expect(step.stockBlocker).toMatch(/dorsal/);
  });

  it("todo ubicado y cerrado no tiene botón principal de paso", () => {
    const step = buildOrderNextStep({
      ...base,
      status: "closed",
      lines: [line("a", 2, 2)],
      lots: [lot("l1", { status: "stored", storage_location_id: "box" })],
    });
    expect(step.leadAction).toBeNull();
    expect(step.finding.tone).toBe("ok");
    expect(step.stockBlocker).toMatch(/ubicadas/);
  });
});
