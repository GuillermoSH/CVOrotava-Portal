import type {
  ClothingPossessionItem,
  ClothingProduct,
  ClothingSize,
  ClothingStockMovement,
} from "@/lib/types/db";

function possessionKey(
  playerId: string,
  productId: string,
  size: ClothingSize,
  jerseyNumber: number | null,
): string {
  return `${playerId}::${productId}::${size}::${jerseyNumber ?? "none"}`;
}

/**
 * Net open deliveries (possession) from movement rows.
 * Prefer returns linked via related_movement_id; unmatched returns allocate FIFO
 * against matching player+product+size+jersey deliveries.
 */
export function computePossessionFromMovements(
  movements: ClothingStockMovement[],
  productById: Map<string, ClothingProduct>,
  playerNameById: Map<string, string>,
): ClothingPossessionItem[] {
  const deliveries = movements
    .filter((m) => m.kind === "delivery" && m.player_id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));

  const returns = movements.filter((m) => m.kind === "return" && m.player_id);

  const openByDelivery = new Map<string, number>();
  for (const delivery of deliveries) {
    openByDelivery.set(delivery.id, delivery.quantity);
  }

  const unmatchedReturns: ClothingStockMovement[] = [];
  for (const ret of returns) {
    if (ret.related_movement_id && openByDelivery.has(ret.related_movement_id)) {
      const open = openByDelivery.get(ret.related_movement_id)!;
      openByDelivery.set(ret.related_movement_id, Math.max(0, open - ret.quantity));
    } else {
      unmatchedReturns.push(ret);
    }
  }

  for (const ret of unmatchedReturns) {
    let remaining = ret.quantity;
    if (!ret.player_id || remaining <= 0) continue;
    for (const delivery of deliveries) {
      if (remaining <= 0) break;
      if (delivery.player_id !== ret.player_id) continue;
      if (delivery.product_id !== ret.product_id) continue;
      if (delivery.size !== ret.size) continue;
      if (delivery.jersey_number !== ret.jersey_number) continue;
      const open = openByDelivery.get(delivery.id) ?? 0;
      if (open <= 0) continue;
      const take = Math.min(open, remaining);
      openByDelivery.set(delivery.id, open - take);
      remaining -= take;
    }
  }

  const items: ClothingPossessionItem[] = [];
  for (const delivery of deliveries) {
    const quantity = openByDelivery.get(delivery.id) ?? 0;
    if (quantity <= 0 || !delivery.player_id) continue;
    const product = productById.get(delivery.product_id);
    if (!product) continue;
    items.push({
      delivery_id: delivery.id,
      player_id: delivery.player_id,
      player_name:
        playerNameById.get(delivery.player_id) ??
        delivery.recipient_name ??
        "Sin nombre",
      product_id: delivery.product_id,
      product,
      size: delivery.size,
      jersey_number: delivery.jersey_number,
      quantity,
      delivered_at: delivery.created_at,
    });
  }

  return items.sort((a, b) => b.delivered_at.localeCompare(a.delivered_at));
}

export function filterPossessionBySeason(
  items: ClothingPossessionItem[],
  season: string | "all",
): ClothingPossessionItem[] {
  if (season === "all") return items;
  return items.filter((item) => item.product.season === season);
}

export function findTeamJerseyConflict(
  possession: ClothingPossessionItem[],
  input: {
    teamPlayerIds: Set<string>;
    excludePlayerId: string;
    jerseyNumber: number;
    productCategory?: string;
  },
): ClothingPossessionItem | null {
  for (const item of possession) {
    if (item.player_id === input.excludePlayerId) continue;
    if (!input.teamPlayerIds.has(item.player_id)) continue;
    if (item.jersey_number !== input.jerseyNumber) continue;
    if (item.product.category !== "shirt_competition") continue;
    return item;
  }
  return null;
}

export function possessionSkuKey(
  productId: string,
  size: ClothingSize,
  jerseyNumber: number | null,
): string {
  return `${productId}::${size}::${jerseyNumber ?? "none"}`;
}

/** Aggregate open qty by player+sku (for conflict / availability checks). */
export function aggregatePossessionQty(
  items: ClothingPossessionItem[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = `${possessionKey(item.player_id, item.product_id, item.size, item.jersey_number)}`;
    map.set(key, (map.get(key) ?? 0) + item.quantity);
  }
  return map;
}
