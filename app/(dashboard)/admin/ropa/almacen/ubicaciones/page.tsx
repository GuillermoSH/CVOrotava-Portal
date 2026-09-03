import { StorageLocationsBoard } from "@/components/clothing/StorageLocationsBoard";
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
        title="Cajas de almacén"
        subtitle="Identifica cada caja con un código. El armario es opcional: sirve para agruparlas cuando las tengas juntas."
      />

      <StorageLocationsBoard tree={tree} />
    </div>
  );
}
