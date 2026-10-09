import { ManualInventoryBatchPage } from "@/components/clothing/ManualInventoryBatchPage";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requireClothingWriteAccess } from "@/lib/clothing/auth";
import {
  buildStorageTree,
  getAllProductsSnapshot,
} from "@/lib/clothing/snapshots";

async function ManualInventoryBatchContent() {
  await requireClothingWriteAccess();
  const [products, storageTree] = await Promise.all([
    getAllProductsSnapshot(),
    buildStorageTree(),
  ]);

  return (
    <ManualInventoryBatchPage products={products} storageTree={storageTree} />
  );
}

export default function ManualInventoryBatchRoute() {
  return (
    <RuntimePage kind="warehouse">
      <ManualInventoryBatchContent />
    </RuntimePage>
  );
}
