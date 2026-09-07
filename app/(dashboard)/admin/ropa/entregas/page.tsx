import { DeliveryForm } from "@/components/clothing/DeliveryForm";
import { requireClothingWriteAccess } from "@/lib/clothing/auth";
import {
  buildStorageTree,
  enrichInventory,
  getProductsSnapshot,
  getRosterSnapshot,
} from "@/lib/clothing/snapshots";

export default async function ClothingDeliveriesPage() {
  await requireClothingWriteAccess();
  const [lots, storageTree, products, players] = await Promise.all([
    enrichInventory(),
    buildStorageTree(),
    getProductsSnapshot(),
    getRosterSnapshot(),
  ]);

  return <DeliveryForm lots={lots} products={products} storageTree={storageTree} players={players} />;
}
