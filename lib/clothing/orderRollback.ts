/**
 * Requisitos para deshacer lo que generó un pedido al volver de serigrafía (sus lotes de stock).
 * Se puede retroceder o eliminar el pedido solo si ese stock sigue intacto: todo pendiente de
 * ubicar, sin dorsales numerados y sin unidades entregadas o dadas de baja.
 */

export type RollbackLot = {
  id: string;
  status: "pending_storage" | "stored";
  jersey_number: number | null;
  quantity: number;
  source_line_id: string | null;
};

export type RollbackLine = {
  id: string;
  quantity_ordered: number;
  quantity_received: number;
};

/** Cantidad con la que se creó el lote de una línea (lo recibido o, si no se anotó, lo pedido). */
export function initialLotQuantity(line: RollbackLine): number {
  return line.quantity_received > 0 ? line.quantity_received : line.quantity_ordered;
}

/** Motivo por el que no se puede deshacer el stock del pedido, o `null` si se puede. */
export function stockRollbackBlocker(
  lots: readonly RollbackLot[],
  lines: readonly RollbackLine[],
): string | null {
  if (lots.some((lot) => lot.status === "stored")) {
    return "Ya hay prendas de este pedido ubicadas en el almacén. Sácalas de su ubicación o dalas de baja antes de retroceder.";
  }
  if (lots.some((lot) => lot.jersey_number != null)) {
    return "Ya hay camisetas de este pedido con dorsal numerado.";
  }

  const byLine = new Map<string, number>();
  for (const lot of lots) {
    if (!lot.source_line_id) continue;
    byLine.set(lot.source_line_id, (byLine.get(lot.source_line_id) ?? 0) + lot.quantity);
  }
  for (const line of lines) {
    const expected = initialLotQuantity(line);
    if (expected <= 0) continue;
    if ((byLine.get(line.id) ?? 0) !== expected) {
      return "Se han entregado o dado de baja prendas de este pedido, así que ya no se puede deshacer.";
    }
  }
  return null;
}
