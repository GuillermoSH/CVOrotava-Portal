import { ClothingHubCards } from "@/components/clothing/ClothingHubCards";
import { ClothingHubQuickLinks } from "@/components/clothing/ClothingHubQuickLinks";
import { ClothingHubSearch } from "@/components/clothing/ClothingHubSearch";
import { requireClothingReadAccess } from "@/lib/clothing/auth";
import { getClothingHubKpis } from "@/lib/clothing/snapshots";

export default async function ClothingHubPage() {
  await requireClothingReadAccess();
  const kpis = await getClothingHubKpis();

  return (
    <>
      <p className="ropa-board-header__meta -mt-1">
        <span className="ropa-digit">{kpis.storedUnits}</span>
        <span> uds en caja</span>
        <span className="ropa-board-header__dot" aria-hidden>
          ·
        </span>
        <span className="ropa-digit">{kpis.openOrders}</span>
        <span> pedidos abiertos</span>
      </p>

      <ClothingHubCards kpis={kpis} />

      <ClothingHubSearch />

      <section className="flex flex-col gap-2">
        <h2 className="ropa-section-heading">Operaciones</h2>
        <ClothingHubQuickLinks
          featuredOrderId={kpis.featuredOpenOrder?.id}
          pendingStorageUnits={kpis.pendingStorageUnits}
        />
      </section>
    </>
  );
}
