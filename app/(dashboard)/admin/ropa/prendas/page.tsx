import { ProductsPageClient } from "@/components/clothing/ProductsPageClient";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireClothingWriteAccess } from "@/lib/clothing/auth";
import { getAllProductsSnapshot } from "@/lib/clothing/snapshots";
import { appRoutes } from "@/lib/constants";

export default async function ClothingProductsPage() {
  await requireClothingWriteAccess();
  const products = await getAllProductsSnapshot();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: appRoutes.clothing.hub, label: "Gestión de ropa" }}
        title="Prendas"
        subtitle="Catálogo interno de piezas del club. Las activas aparecen al crear pedidos."
      />
      <ProductsPageClient products={products} />
    </div>
  );
}
