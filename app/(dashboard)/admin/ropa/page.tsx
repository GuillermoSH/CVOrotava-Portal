import { ClothingHubCards } from "@/components/clothing/ClothingHubCards";
import { ClothingHubQuickLinks } from "@/components/clothing/ClothingHubQuickLinks";
import { ClothingHubSearch } from "@/components/clothing/ClothingHubSearch";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requireClothingReadAccess } from "@/lib/clothing/auth";
import { getClothingHubKpis } from "@/lib/clothing/snapshots";

async function ClothingHubContent() {
  await requireClothingReadAccess();
  const kpis = await getClothingHubKpis();

  return (
    <>
      <div className="ropa-hub-stats">
        <p className="ropa-board-header__meta">
          <span className="ropa-digit">{kpis.storedUnits}</span>
          <span> uds en caja</span>
          <span className="ropa-board-header__dot" aria-hidden>
            ·
          </span>
          <span className="ropa-digit">{kpis.openOrders}</span>
          <span> pedidos abiertos</span>
        </p>
      </div>

      <ClothingHubCards kpis={kpis} />

      <ClothingHubSearch />

      <section className="flex flex-col gap-2.5">
        <h2 className="ropa-section-label">Accesos rápidos</h2>
        <ClothingHubQuickLinks
          featuredOrderId={kpis.featuredOpenOrder?.id}
          pendingStorageUnits={kpis.pendingStorageUnits}
        />
      </section>
    </>
  );
}

export default function ClothingHubPage() {
  return (
    <RuntimePage kind="hub">
      <ClothingHubContent />
    </RuntimePage>
  );
}
