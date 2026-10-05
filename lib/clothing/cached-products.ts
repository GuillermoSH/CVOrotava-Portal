import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { clothingProductsTag } from "@/lib/cache/tags";
import { listActiveProducts, listProducts } from "@/lib/clothing/repository/products";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { ClothingProduct } from "@/lib/types/db";

function sortCatalog(products: ClothingProduct[]): ClothingProduct[] {
  return [...products].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return a.model.localeCompare(b.model, "es");
  });
}

/**
 * Catálogo completo (staff). Cacheado sin cookies; la página debe exigir auth antes.
 */
export async function getCachedAllProductsSnapshot(): Promise<ClothingProduct[]> {
  "use cache";
  cacheTag(clothingProductsTag());
  cacheLife("hours");

  const db = createServiceRoleClient();
  const products = await listProducts(db);
  return sortCatalog(products);
}

/** Prendas activas para pedidos y entregas. */
export async function getCachedActiveProductsSnapshot(): Promise<ClothingProduct[]> {
  "use cache";
  cacheTag(clothingProductsTag());
  cacheLife("hours");

  const db = createServiceRoleClient();
  return listActiveProducts(db);
}
