import { requireClothingReadAccess } from "@/lib/clothing/auth";
import {
  buildStorageTree,
  enrichInventory,
  getAllProductsSnapshot,
} from "@/lib/clothing/snapshots";

import { InventoryWarehouseView } from "@/components/clothing/InventoryWarehouseView";

export default async function ClothingWarehousePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireClothingReadAccess();
  const [{ q }, lots, storageTree, products] = await Promise.all([
    searchParams,
    enrichInventory(),
    buildStorageTree(),
    getAllProductsSnapshot(),
  ]);

  return (
    <InventoryWarehouseView
      lots={lots}
      products={products}
      storageTree={storageTree}
      initialQuery={q?.trim() ?? ""}
    />
  );
}
