import { ClothingHubCards } from "@/components/clothing/ClothingHubCards";
import { ClothingHubQuickLinks } from "@/components/clothing/ClothingHubQuickLinks";
import { requireClothingReadAccess } from "@/lib/clothing/auth";
import { getClothingHubKpis } from "@/lib/clothing/snapshots";

export default async function ClothingHubPage() {
  await requireClothingReadAccess();
  const kpis = await getClothingHubKpis();

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="section-title">Indicadores</h2>
        <ClothingHubCards kpis={kpis} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Operaciones</h2>
        <ClothingHubQuickLinks />
      </section>
    </>
  );
}
