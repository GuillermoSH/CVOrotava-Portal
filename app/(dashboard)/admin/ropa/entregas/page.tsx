import { DeliveryForm } from "@/components/clothing/DeliveryForm";
import { DeliveryHistory } from "@/components/clothing/DeliveryHistory";
import { DashboardPage } from "@/components/layout/DashboardPage";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requireClothingWriteAccess } from "@/lib/clothing/auth";
import { getClothingDb } from "@/lib/clothing/repository/client";
import { listPendingPlanned } from "@/lib/clothing/repository/plannedDeliveries";
import {
  buildStorageTree,
  enrichDeliveryHistory,
  enrichInventory,
  enrichPossession,
  getProductsSnapshot,
  getRosterSnapshot,
} from "@/lib/clothing/snapshots";

async function ClothingDeliveriesContent() {
  await requireClothingWriteAccess();
  const [lots, storageTree, products, players, deliveries, possession, planned] = await Promise.all([
    enrichInventory(),
    buildStorageTree(),
    getProductsSnapshot(),
    getRosterSnapshot(),
    enrichDeliveryHistory(),
    enrichPossession(),
    getClothingDb().then((db) => listPendingPlanned(db)),
  ]);

  return (
    <DashboardPage className="flex flex-col gap-8">
      <DeliveryForm
        lots={lots}
        products={products}
        storageTree={storageTree}
        players={players}
        possession={possession}
        planned={planned}
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

export default function ClothingDeliveriesPage() {
  return (
    <RuntimePage kind="deliveries">
      <ClothingDeliveriesContent />
    </RuntimePage>
  );
}
