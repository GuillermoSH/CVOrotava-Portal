import { describe, expect, it } from "vitest";

import { stockRollbackBlocker, type RollbackLot } from "@/lib/clothing/orderRollback";

const lines = [
  { id: "l1", quantity_ordered: 5, quantity_received: 4 },
  { id: "l2", quantity_ordered: 2, quantity_received: 0 },
];

const lot = (patch: Partial<RollbackLot> & { source_line_id: string; quantity: number }): RollbackLot => ({
  id: `lot-${patch.source_line_id}`,
  status: "pending_storage",
  jersey_number: null,
  ...patch,
});

describe("stockRollbackBlocker", () => {
  const intact = [
    lot({ source_line_id: "l1", quantity: 4 }),
    lot({ source_line_id: "l2", quantity: 2 }),
  ];

  it("permite deshacer si el stock está intacto (lo recibido, o lo pedido si no se anotó)", () => {
    expect(stockRollbackBlocker(intact, lines)).toBeNull();
  });

  it("bloquea si hay lotes ya ubicados", () => {
    const lots = [{ ...intact[0]!, status: "stored" as const }, intact[1]!];
    expect(stockRollbackBlocker(lots, lines)).toMatch(/ubicadas/);
  });

  it("bloquea si hay dorsales numerados", () => {
    const lots = [{ ...intact[0]!, jersey_number: 7 }, intact[1]!];
    expect(stockRollbackBlocker(lots, lines)).toMatch(/dorsal/);
  });

  it("bloquea si se entregó o dio de baja alguna unidad", () => {
    const lots = [lot({ source_line_id: "l1", quantity: 3 }), intact[1]!];
    expect(stockRollbackBlocker(lots, lines)).toMatch(/entregado/);
  });

  it("bloquea si falta el lote de una línea (ya salió entero)", () => {
    expect(stockRollbackBlocker([intact[0]!], lines)).toMatch(/entregado/);
  });
});
