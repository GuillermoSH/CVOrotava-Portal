import { InventoryWarehouseView } from "@/components/clothing/InventoryWarehouseView";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requireClothingReadAccess } from "@/lib/clothing/auth";
import type { PlannedJerseyHint } from "@/lib/clothing/plannedDeliveries";
import { getClothingDb } from "@/lib/clothing/repository/client";
import { listPendingPlanned } from "@/lib/clothing/repository/plannedDeliveries";
import {
  buildStorageTree,
  enrichInventory,
  enrichOrders,
  getAllProductsSnapshot,
  getRosterSnapshot,
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
  const [params, lots, storageTree, products, orders, pendingPlanned, roster] = await Promise.all([
    searchParams,
    enrichInventory(),
    buildStorageTree(),
    getAllProductsSnapshot(),
    enrichOrders(),
    getClothingDb().then(listPendingPlanned),
    getRosterSnapshot(),
  ]);

  // Dorsales previstos en los pedidos: se proponen al numerar las camisetas que llegan.
  const playerName = new Map(roster.map((player) => [player.id, player.full_name]));
  const plannedJerseys: PlannedJerseyHint[] = pendingPlanned.flatMap((row) =>
    row.jersey_number == null
      ? []
      : [
          {
            order_id: row.order_id,
            product_id: row.product_id,
            size: row.size,
            jersey_number: row.jersey_number,
            player_name: playerName.get(row.player_id) ?? "Jugador",
          },
        ],
  );

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
      plannedJerseys={plannedJerseys}
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
