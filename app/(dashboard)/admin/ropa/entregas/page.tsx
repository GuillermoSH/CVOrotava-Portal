import { DeliveryForm } from "@/components/clothing/DeliveryForm";
import { DeliveryHistory } from "@/components/clothing/DeliveryHistory";
import { DashboardPage } from "@/components/layout/DashboardPage";
import { requireClothingWriteAccess } from "@/lib/clothing/auth";
import {
  buildStorageTree,
  enrichDeliveryHistory,
  enrichInventory,
  enrichPossession,
  getProductsSnapshot,
  getRosterSnapshot,
} from "@/lib/clothing/snapshots";

export default async function ClothingDeliveriesPage() {
  await requireClothingWriteAccess();
  const [lots, storageTree, products, players, deliveries, possession] = await Promise.all([
    enrichInventory(),
    buildStorageTree(),
    getProductsSnapshot(),
    getRosterSnapshot(),
    enrichDeliveryHistory(),
    enrichPossession(),
  ]);

  return (
    <DashboardPage className="flex flex-col gap-8">
      <DeliveryForm
        lots={lots}
        products={products}
        storageTree={storageTree}
        players={players}
        possession={possession}
      />
      <DeliveryHistory
        deliveries={deliveries}
        players={players}
        possession={possession}
        lots={lots}
        storageTree={storageTree}
      />
    </DashboardPage>
  );
}
