import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { clothingInventoryTag } from "@/lib/cache/tags";
import { buildLocationPath, productMapFromList } from "@/lib/clothing/repository/helpers";
import { listInventoryLots } from "@/lib/clothing/repository/inventory";
import { listLocations } from "@/lib/clothing/repository/locations";
import { listProducts } from "@/lib/clothing/repository/products";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { ClothingInventoryLotWithDetails } from "@/lib/types/db";

/**
 * Lotes de almacén enriquecidos (staff). Cacheado sin cookies; auth fuera.
 */
export async function getCachedInventorySnapshot(): Promise<ClothingInventoryLotWithDetails[]> {
  "use cache";
  cacheTag(clothingInventoryTag());
  cacheLife("hours");

  const db = createServiceRoleClient();
  const [lots, products, locations] = await Promise.all([
    listInventoryLots(db),
    listProducts(db),
    listLocations(db),
  ]);
  const productMap = productMapFromList(products);

  return lots
    .map((lot) => {
      const product = productMap.get(lot.product_id);
      if (!product) return null;
      return {
        ...lot,
        product,
        location_path: buildLocationPath(lot.storage_location_id, locations),
      };
    })
    .filter((lot): lot is ClothingInventoryLotWithDetails => lot !== null)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}
