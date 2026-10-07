import { ProductsPageClient } from "@/components/clothing/ProductsPageClient";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requireClothingWriteAccess } from "@/lib/clothing/auth";
import { getAllProductsSnapshot } from "@/lib/clothing/snapshots";

async function ClothingProductsContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireClothingWriteAccess();
  const [{ q }, products] = await Promise.all([searchParams, getAllProductsSnapshot()]);
  return <ProductsPageClient products={products} initialQuery={q?.trim() ?? ""} />;
}

export default function ClothingProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <RuntimePage kind="products">
      <ClothingProductsContent searchParams={searchParams} />
    </RuntimePage>
  );
}
