import { requireClothingReadAccess } from "@/lib/clothing/auth";
import { buildStorageTree, enrichInventory, getProductsSnapshot } from "@/lib/clothing/snapshots";

import { InventoryWarehouseView } from "@/components/clothing/InventoryWarehouseView";

export default async function ClothingWarehousePage() {
  await requireClothingReadAccess();
  const [lots, storageTree, products] = await Promise.all([
    enrichInventory(),
    buildStorageTree(),
    getProductsSnapshot(),
  ]);

  return <InventoryWarehouseView lots={lots} products={products} storageTree={storageTree} />;
}
