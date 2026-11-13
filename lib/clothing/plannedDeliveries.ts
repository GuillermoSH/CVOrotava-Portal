import { stockPoolKey, type StockPool } from "@/lib/clothing/stockSources";
import type { ClothingPlannedDelivery, ClothingSize } from "@/lib/types/db";

/**
 * Lógica pura de las entregas previstas: validar lo asignado frente a lo pedido, encontrar en
 * stock cada prenda prevista y decidir qué previsiones cierra una entrega.
 */

export type PlannedRowInput = {
  player_id: string;
  product_id: string;
  size: ClothingSize;
  jersey_number: number | null;
};

export type OrderLineInput = {
  product_id: string;
  size: ClothingSize;
  quantity_ordered: number;
};

const skuKey = (productId: string, size: ClothingSize) => `${productId}::${size}`;

/**
 * Comprueba que las previsiones caben en el pedido: cada una debe ser de una prenda y talla
 * pedidas, no puede haber más asignadas que pedidas (contando lo ya entregado) y un mismo
 * dorsal no se repite en la misma prenda. Devuelve el primer problema o null si todo cuadra.
 */
export function validatePlannedRows(
  rows: readonly PlannedRowInput[],
  lines: readonly OrderLineInput[],
  alreadyDelivered: readonly Pick<PlannedRowInput, "product_id" | "size">[] = [],
): string | null {
  const ordered = new Map<string, number>();
  for (const line of lines) {
    const key = skuKey(line.product_id, line.size);
    ordered.set(key, (ordered.get(key) ?? 0) + line.quantity_ordered);
  }

  const assigned = new Map<string, number>();
  for (const row of alreadyDelivered) {
    const key = skuKey(row.product_id, row.size);
    assigned.set(key, (assigned.get(key) ?? 0) + 1);
  }

  const jerseys = new Set<string>();
  for (const row of rows) {
    const key = skuKey(row.product_id, row.size);
    if (!ordered.has(key)) return "Hay una prevista de una prenda o talla que no está en el pedido";
    assigned.set(key, (assigned.get(key) ?? 0) + 1);
    if (row.jersey_number != null) {
      const jerseyKey = `${row.product_id}::${row.jersey_number}`;
      if (jerseys.has(jerseyKey)) return `El dorsal ${row.jersey_number} está repetido en la misma prenda`;
      jerseys.add(jerseyKey);
    }
  }

  for (const [key, count] of assigned) {
    if (count > (ordered.get(key) ?? 0)) {
      return "Hay más unidades asignadas a jugadores que pedidas en alguna línea";
    }
  }
  return null;
}

/** Unidades asignadas por prenda y talla (para mostrar «2 de 5 asignadas»). */
export function assignedBySku(
  rows: readonly Pick<PlannedRowInput, "product_id" | "size">[],
): Map<string, number> {
  const out = new Map<string, number>();
  for (const row of rows) {
    const key = skuKey(row.product_id, row.size);
    out.set(key, (out.get(key) ?? 0) + 1);
  }
  return out;
}

export { skuKey as plannedSkuKey };

export type PlannedStockMatch = {
  planned: ClothingPlannedDelivery;
  /** Montón de stock del que sale la prenda; null si todavía no hay en stock. */
  pool: StockPool | null;
};

/**
 * Para cada previsión pendiente de un jugador, busca la prenda en stock: misma prenda, talla y
 * dorsal (sin dorsal solo casa con stock sin dorsal). Cada unidad de stock se asigna una vez,
 * así que dos previstas iguales no reservan la misma unidad.
 */
export function matchPlannedToStock(
  planned: readonly ClothingPlannedDelivery[],
  pools: readonly StockPool[],
): PlannedStockMatch[] {
  const left = new Map<string, number>();
  for (const pool of pools) {
    left.set(
      stockPoolKey(pool.productId, pool.size, pool.storageLocationId, pool.jerseyNumber),
      pool.quantity,
    );
  }

  return planned.map((item) => {
    const candidates = pools.filter(
      (pool) =>
        pool.productId === item.product_id &&
        pool.size === item.size &&
        pool.jerseyNumber === item.jersey_number,
    );
    for (const pool of candidates) {
      const key = stockPoolKey(pool.productId, pool.size, pool.storageLocationId, pool.jerseyNumber);
      const remaining = left.get(key) ?? 0;
      if (remaining > 0) {
        left.set(key, remaining - 1);
        return { planned: item, pool };
      }
    }
    return { planned: item, pool: null };
  });
}

export type DeliveredUnit = {
  product_id: string;
  size: ClothingSize;
  jersey_number: number | null;
  quantity: number;
};

/**
 * Qué previsiones pendientes de un jugador cierra una entrega. Primero casa por dorsal exacto y,
 * con lo que sobra, una prevista sin dorsal se da por cumplida con cualquier unidad de la misma
 * prenda y talla (por ejemplo si al entregar se escoge una con dorsal).
 */
export function plannedIdsFulfilledBy(
  pending: readonly ClothingPlannedDelivery[],
  delivered: readonly DeliveredUnit[],
): string[] {
  const available = pending.map((item) => ({ item, taken: false }));
  const units: { product_id: string; size: ClothingSize; jersey_number: number | null }[] = [];
  for (const line of delivered) {
    for (let i = 0; i < line.quantity; i += 1) {
      units.push({ product_id: line.product_id, size: line.size, jersey_number: line.jersey_number });
    }
  }

  const unmatched: typeof units = [];
  for (const unit of units) {
    const hit = available.find(
      (a) =>
        !a.taken &&
        a.item.product_id === unit.product_id &&
        a.item.size === unit.size &&
        a.item.jersey_number === unit.jersey_number,
    );
    if (hit) hit.taken = true;
    else unmatched.push(unit);
  }

  for (const unit of unmatched) {
    const hit = available.find(
      (a) =>
        !a.taken &&
        a.item.jersey_number == null &&
        a.item.product_id === unit.product_id &&
        a.item.size === unit.size,
    );
    if (hit) hit.taken = true;
  }

  return available.filter((a) => a.taken).map((a) => a.item.id);
}

export type PlannedJerseyHint = {
  order_id: string;
  product_id: string;
  size: ClothingSize;
  jersey_number: number;
  player_name: string;
};

/**
 * Dorsales previstos que se proponen al numerar un lote del pedido: los de su misma prenda y
 * talla que aún no están numerados, de menor a mayor y sin pasar de las unidades del lote.
 */
export function suggestJerseysForLot(
  hints: readonly PlannedJerseyHint[],
  lot: { source_order_id: string | null; product_id: string; size: ClothingSize; quantity: number },
  takenJerseys: readonly number[] = [],
): PlannedJerseyHint[] {
  if (!lot.source_order_id) return [];
  const taken = new Set(takenJerseys);
  const seen = new Set<number>();
  return hints
    .filter(
      (hint) =>
        hint.order_id === lot.source_order_id &&
        hint.product_id === lot.product_id &&
        hint.size === lot.size &&
        !taken.has(hint.jersey_number),
    )
    .sort((a, b) => a.jersey_number - b.jersey_number)
    .filter((hint) => {
      if (seen.has(hint.jersey_number)) return false;
      seen.add(hint.jersey_number);
      return true;
    })
    .slice(0, Math.max(0, lot.quantity));
}

/**
 * Qué previsiones ya entregadas de un jugador vuelven a pendientes al devolver una prenda: las de
 * la misma prenda y talla, primero la del mismo dorsal y luego las sin dorsal, las entregadas más
 * recientemente primero y sin pasar de las unidades devueltas.
 */
export function plannedIdsReopenedBy(
  delivered: readonly ClothingPlannedDelivery[],
  returned: { product_id: string; size: ClothingSize; jersey_number: number | null; quantity: number },
): string[] {
  const sameSku = delivered
    .filter((item) => item.product_id === returned.product_id && item.size === returned.size)
    .sort((a, b) => (b.delivered_at ?? "").localeCompare(a.delivered_at ?? ""));

  const exact = sameSku.filter((item) => item.jersey_number === returned.jersey_number);
  const loose = sameSku.filter((item) => item.jersey_number == null && returned.jersey_number != null);

  return [...exact, ...loose].slice(0, Math.max(0, returned.quantity)).map((item) => item.id);
}
