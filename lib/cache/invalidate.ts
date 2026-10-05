import "server-only";

import { revalidatePath, updateTag } from "next/cache";

import { appRoutes } from "@/lib/constants";
import { clothingProductsTag, playerTag, rosterSeasonTag } from "@/lib/cache/tags";

const CLOTHING_PRODUCT_PATHS = [
  "/admin/ropa",
  "/admin/ropa/prendas",
  "/admin/ropa/pedidos",
  "/admin/ropa/pedidos/nuevo",
  "/admin/ropa/almacen",
] as const;

/** Catálogo de prendas (use cache) + rutas que lo consumen. */
export function invalidateClothingProducts() {
  updateTag(clothingProductsTag());
  for (const path of CLOTHING_PRODUCT_PATHS) {
    revalidatePath(path, "layout");
  }
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
