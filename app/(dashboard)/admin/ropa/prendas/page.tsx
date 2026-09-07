import { ProductsPageClient } from "@/components/clothing/ProductsPageClient";
import { requireClothingWriteAccess } from "@/lib/clothing/auth";
import { getAllProductsSnapshot } from "@/lib/clothing/snapshots";

export default async function ClothingProductsPage() {
  await requireClothingWriteAccess();
  const products = await getAllProductsSnapshot();

  return <ProductsPageClient products={products} />;
}
