import { StorageLocationsBoard } from "@/components/clothing/StorageLocationsBoard";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requireClothingReadAccess } from "@/lib/clothing/auth";
import { buildStorageTree } from "@/lib/clothing/snapshots";

async function ClothingLocationsContent() {
  await requireClothingReadAccess();
  const tree = await buildStorageTree();
  return <StorageLocationsBoard tree={tree} />;
}

export default function ClothingLocationsPage() {
  return (
    <RuntimePage kind="locations">
      <ClothingLocationsContent />
    </RuntimePage>
  );
}
