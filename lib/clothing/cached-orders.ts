import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { clothingOrdersTag } from "@/lib/cache/tags";
import { productMapFromList } from "@/lib/clothing/repository/helpers";
import { listOrdersWithLines } from "@/lib/clothing/repository/orders";
import { listProducts } from "@/lib/clothing/repository/products";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type {
  ClothingOrderLineWithProduct,
  ClothingOrderWithLines,
  ClothingProduct,
} from "@/lib/types/db";

function enrichOrderLines(
  lines: Awaited<ReturnType<typeof listOrdersWithLines>>["lines"],
  productMap: Map<string, ClothingProduct>,
): ClothingOrderLineWithProduct[] {
  return lines
    .map((line) => {
      const product = productMap.get(line.product_id);
      if (!product) return null;
      return { ...line, product };
    })
    .filter((line): line is ClothingOrderLineWithProduct => line !== null);
}

/**
 * Pedidos con líneas enriquecidas (staff). Cacheado sin cookies; auth fuera.
 */
export async function getCachedOrdersSnapshot(): Promise<ClothingOrderWithLines[]> {
  "use cache";
  cacheTag(clothingOrdersTag());
  cacheLife("hours");

  const db = createServiceRoleClient();
  const [{ orders, lines }, products] = await Promise.all([
    listOrdersWithLines(db),
    listProducts(db),
  ]);
  const productMap = productMapFromList(products);

  return orders
    .map((order) => ({
      ...order,
      lines: enrichOrderLines(
        lines.filter((l) => l.order_id === order.id),
        productMap,
      ),
    }))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}
