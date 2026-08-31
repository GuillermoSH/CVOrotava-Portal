import Link from "next/link";

import { StorageLocationTree } from "@/components/clothing/StorageLocationTree";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireClothingReadAccess } from "@/lib/clothing/auth";
import { buildStorageTree } from "@/lib/clothing/snapshots";
import { appRoutes } from "@/lib/constants";

export default async function ClothingLocationsPage() {
  await requireClothingReadAccess();
  const tree = await buildStorageTree();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: appRoutes.clothing.warehouse, label: "Inventario" }}
        title="Ubicaciones de almacén"
        subtitle="Jerarquía Armario → Balda → Caja. Solo las cajas reciben stock."
      />

      <StorageLocationTree tree={tree} />
    </div>
  );
}
