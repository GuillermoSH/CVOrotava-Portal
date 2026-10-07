import "server-only";

import { revalidatePath, updateTag } from "next/cache";

import { appRoutes } from "@/lib/constants";
import {
  clothingInventoryTag,
  clothingOrdersTag,
  clothingProductsTag,
  paymentConceptsTag,
  playerTag,
  rosterSeasonTag,
} from "@/lib/cache/tags";

/** Catálogo de prendas (use cache). Rutas no cacheadas siguen con path. */
export function invalidateClothingProducts() {
  updateTag(clothingProductsTag());
  // Snapshots de inventario/pedidos incrustan datos de prenda.
  updateTag(clothingInventoryTag());
  updateTag(clothingOrdersTag());
  revalidatePath("/admin/ropa/prendas", "layout");
  revalidatePath("/admin/ropa/pedidos/nuevo");
}

/** Lotes de almacén (use cache) + rutas que aún no van por tag. */
export function invalidateClothingInventory(playerId?: string) {
  updateTag(clothingInventoryTag());
  revalidatePath("/admin/ropa/almacen", "layout");
  revalidatePath("/admin/ropa/entregas", "layout");
  revalidatePath("/admin/ropa");
  if (playerId) {
    revalidatePath(appRoutes.players.detail(playerId));
  }
}

/** Pedidos de ropa (use cache). */
export function invalidateClothingOrders() {
  updateTag(clothingOrdersTag());
  revalidatePath("/admin/ropa/pedidos", "layout");
  revalidatePath("/admin/ropa");
}

/** Conceptos de pago (use cache). */
export function invalidatePaymentConcepts() {
  updateTag(paymentConceptsTag());
  revalidatePath(appRoutes.payments.concepts);
  revalidatePath(appRoutes.payments.list);
}

/** Plantilla / entregas; tags preparados para caché futura por temporada. */
export function invalidateRoster(season?: string) {
  if (season) {
    updateTag(rosterSeasonTag(season));
  }
  revalidatePath("/admin/jugadores", "layout");
  revalidatePath("/admin/ropa/entregas");
}

export function invalidatePlayer(playerId: string) {
  updateTag(playerTag(playerId));
  revalidatePath(appRoutes.players.detail(playerId));
  revalidatePath("/admin/jugadores", "layout");
}
