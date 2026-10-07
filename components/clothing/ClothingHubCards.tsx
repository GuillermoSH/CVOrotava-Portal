import { ClothingSetBand } from "@/components/clothing/ClothingSetBand";
import { ORDER_STATUS_LABELS } from "@/lib/clothing/constants";
import { appRoutes } from "@/lib/constants";
import type { ClothingHubKpis } from "@/lib/clothing/snapshots";

export function ClothingHubCards({ kpis }: { kpis: ClothingHubKpis }) {
  const featured = kpis.featuredOpenOrder;
  const pendingHref =
    kpis.pendingStorageUnits > 0
      ? `${appRoutes.clothing.warehouse}?status=pending_storage`
      : appRoutes.clothing.warehouse;

  if (featured) {
    return (
      <ClothingSetBand
        title={featured.reference}
        body={`${ORDER_STATUS_LABELS[featured.status]} · ${featured.supplier_name}`}
        href={appRoutes.clothing.orderDetail(featured.id)}
        hrefLabel="Abrir pedido"
        score={{ value: String(kpis.openOrders), helper: "abiertos" }}
      />
    );
  }

  if (kpis.pendingStorageUnits > 0) {
    return (
      <ClothingSetBand
        title="Ubicar en almacén"
        body={`${kpis.pendingStorageLots} lote${kpis.pendingStorageLots === 1 ? "" : "s"} sin caja`}
        href={pendingHref}
        hrefLabel="Ir al almacén"
        score={{
          value: String(kpis.pendingStorageUnits),
          helper: "uds pendientes",
        }}
      />
    );
  }

  return (
    <ClothingSetBand
      lit={false}
      title="Sin set activo"
      body="No hay pedidos abiertos ni stock pendiente de ubicar."
      href={appRoutes.clothing.newOrder}
      hrefLabel="Nuevo pedido"
      score={{ value: String(kpis.storedUnits), helper: "uds en caja" }}
    />
  );
}
