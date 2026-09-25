import { ProductsPageClient } from "@/components/clothing/ProductsPageClient";
import { requireClothingWriteAccess } from "@/lib/clothing/auth";
import { getAllProductsSnapshot } from "@/lib/clothing/snapshots";

export default async function ClothingProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireClothingWriteAccess();
  const [{ q }, products] = await Promise.all([searchParams, getAllProductsSnapshot()]);

  return <ProductsPageClient products={products} initialQuery={q?.trim() ?? ""} />;
}
