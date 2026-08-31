import { ClothingHubCards } from "@/components/clothing/ClothingHubCards";
import { ClothingHubQuickLinks } from "@/components/clothing/ClothingHubQuickLinks";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireClothingReadAccess } from "@/lib/clothing/auth";
import { getClothingHubKpis } from "@/lib/clothing/snapshots";

export default async function ClothingHubPage() {
  await requireClothingReadAccess();
  const kpis = await getClothingHubKpis();

  return (
    <div className="clothing-page-with-sticky flex flex-col gap-8 lg:gap-10">
      <PageHeader
        title="Gestión de ropa"
        subtitle="Pedidos a proveedor, serigrafía e inventario en almacén. Operaciones internas de dirección."
      />

      <section className="flex flex-col gap-4">
        <h2 className="section-title">Indicadores</h2>
        <ClothingHubCards kpis={kpis} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="section-title">Operaciones</h2>
        <ClothingHubQuickLinks />
      </section>
    </div>
  );
}
