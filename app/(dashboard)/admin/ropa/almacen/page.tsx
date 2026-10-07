import { InventoryWarehouseView } from "@/components/clothing/InventoryWarehouseView";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requireClothingReadAccess } from "@/lib/clothing/auth";
import {
  buildStorageTree,
  enrichInventory,
  enrichOrders,
  getAllProductsSnapshot,
} from "@/lib/clothing/snapshots";
import type { ClothingInventoryStatus } from "@/lib/types/db";

function parseStatus(value: string | undefined): ClothingInventoryStatus | "all" {
  if (value === "pending_storage" || value === "stored") return value;
  return "all";
}

async function ClothingWarehouseContent({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    order?: string;
    status?: string;
    missingJersey?: string;
  }>;
}) {
  await requireClothingReadAccess();
  const [params, lots, storageTree, products, orders] = await Promise.all([
    searchParams,
    enrichInventory(),
    buildStorageTree(),
    getAllProductsSnapshot(),
    enrichOrders(),
  ]);

  const sourceOrderId = params.order?.trim() || null;
  const sourceOrderLabel = sourceOrderId
    ? (orders.find((o) => o.id === sourceOrderId)?.reference ?? null)
    : null;

  return (
    <InventoryWarehouseView
      lots={lots}
      products={products}
      storageTree={storageTree}
      initialQuery={params.q?.trim() ?? ""}
      initialStatus={parseStatus(params.status)}
      initialMissingJersey={params.missingJersey === "1"}
      sourceOrderId={sourceOrderId}
      sourceOrderLabel={sourceOrderLabel}
    />
  );
}

export default function ClothingWarehousePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    order?: string;
    status?: string;
    missingJersey?: string;
  }>;
}) {
  return (
    <RuntimePage kind="warehouse">
      <ClothingWarehouseContent searchParams={searchParams} />
    </RuntimePage>
  );
}
