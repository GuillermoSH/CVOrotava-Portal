import { ClothingHubCards } from "@/components/clothing/ClothingHubCards";
import { ClothingHubQuickLinks } from "@/components/clothing/ClothingHubQuickLinks";
import { ClothingHubSearch } from "@/components/clothing/ClothingHubSearch";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requireClothingReadAccess } from "@/lib/clothing/auth";
import { getClothingHubKpis } from "@/lib/clothing/snapshots";
import { reveal } from "@/lib/ui/reveal";

async function ClothingHubContent() {
  await requireClothingReadAccess();
  const kpis = await getClothingHubKpis();

  return (
    <div className="ropa-hub">
      <div className="ropa-hub__ahora">
        <p className="ropa-board-header__meta reveal" style={reveal(0)}>
          <span className="ropa-digit">{kpis.storedUnits}</span>
          <span> uds en caja</span>
          <span className="ropa-board-header__dot" aria-hidden>
            ·
          </span>
          <span className="ropa-digit">{kpis.openOrders}</span>
          <span> pedidos abiertos</span>
        </p>
        <div className="reveal" style={reveal(1)}>
          <ClothingHubCards kpis={kpis} />
        </div>
      </div>

      <div className="reveal" style={reveal(2)}>
        <ClothingHubSearch />
      </div>

      <section className="ropa-hub__ops" aria-labelledby="ropa-hub-ops-heading">
        <h2 id="ropa-hub-ops-heading" className="ropa-section-label reveal" style={reveal(3)}>
          Accesos rápidos
        </h2>
        <div>
          <ClothingHubQuickLinks
            featuredOrderId={kpis.featuredOpenOrder?.id}
            pendingStorageUnits={kpis.pendingStorageUnits}
          />
        </div>
      </section>
    </div>
  );
}

export default function ClothingHubPage() {
  return (
    <RuntimePage kind="hub">
      <ClothingHubContent />
    </RuntimePage>
  );
}
