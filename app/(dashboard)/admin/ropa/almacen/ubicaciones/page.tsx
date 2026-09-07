import { StorageLocationsBoard } from "@/components/clothing/StorageLocationsBoard";
import { requireClothingReadAccess } from "@/lib/clothing/auth";
import { buildStorageTree } from "@/lib/clothing/snapshots";

export default async function ClothingLocationsPage() {
  await requireClothingReadAccess();
  const tree = await buildStorageTree();

  return <StorageLocationsBoard tree={tree} />;
}
