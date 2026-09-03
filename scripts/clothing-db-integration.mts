/**
 * Integration tests for clothing warehouse against Supabase.
 *
 * Requires:
 * - `.env.local` with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * - Migrations applied: 20260831130000_clothing_warehouse.sql, 20260831140000_clothing_manual_inventory.sql
 *
 * All test rows use the TEST-CLOTHING-* prefix and are deleted in finally (even on failure).
 */

import { createClient } from "@supabase/supabase-js";

import {
  assignLotToLocation,
  createManualInventoryLot,
  deleteLotsByIds,
  listInventoryLots,
} from "../lib/clothing/repository/inventory";
import {
  createLocation,
  deleteLocationsByIds,
} from "../lib/clothing/repository/locations";
import {
  createSupplierOrder,
  deleteOrdersByIds,
  listOrdersWithLines,
  updateOrderLineReceived,
  updateOrderStatus,
} from "../lib/clothing/repository/orders";
import {
  createProduct,
  deleteProductsByIds,
} from "../lib/clothing/repository/products";
import { getCurrentSeason } from "../lib/season";

function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensureManualInventoryMigration() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;

  const { Client } = await import("pg");
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query(`
      alter table public.clothing_inventory_lots
        add column if not exists source_type text not null default 'order'
          check (source_type = any (array['order'::text, 'manual'::text]));
      alter table public.clothing_inventory_lots
        add column if not exists notes text;
    `);
    console.log("→ Applied clothing manual inventory migration (source_type, notes).");
  } finally {
    await client.end();
  }
}

async function ensureClothingTableGrants() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;

  const { Client } = await import("pg");
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query(`
      grant usage on type public.clothing_size to authenticated;
      grant select, insert, update, delete on table public.clothing_products to authenticated;
      grant select, insert, update, delete on table public.clothing_supplier_orders to authenticated;
      grant select, insert, update, delete on table public.clothing_supplier_order_lines to authenticated;
      grant select, insert, update, delete on table public.clothing_storage_locations to authenticated;
      grant select, insert, update, delete on table public.clothing_inventory_lots to authenticated;
    `);
    console.log("→ Applied clothing table grants for authenticated role.");
  } finally {
    await client.end();
  }
}

async function assertSchema(db: ReturnType<typeof createServiceRoleClient>) {
  const { error } = await db.from("clothing_inventory_lots").select("source_type, notes").limit(0);
  if (error) {
    throw new Error(
      "Migration 20260831140000_clothing_manual_inventory.sql is not applied. " +
        "Run it in the Supabase SQL editor, or set DATABASE_URL in .env.local for auto-apply.",
    );
  }
}

const TEST_PREFIX = "TEST-CLOTHING";
const SEASON = getCurrentSeason();

type CleanupIds = {
  lotIds: string[];
  orderIds: string[];
  locationIds: string[];
  productIds: string[];
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

async function cleanup(db: ReturnType<typeof createServiceRoleClient>, ids: CleanupIds) {
  try {
    await deleteLotsByIds(db, ids.lotIds);
    await deleteOrdersByIds(db, ids.orderIds);
    // Delete children before parents: box, shelf, cabinet
    const reversed = [...ids.locationIds].reverse();
    await deleteLocationsByIds(db, reversed);
    await deleteProductsByIds(db, ids.productIds);
  } catch (e) {
    console.error("Cleanup error (manual review may be needed):", e);
  }
}

async function main() {
  let failed = false;
  let db: ReturnType<typeof createServiceRoleClient> | null = null;
  const ids: CleanupIds = {
    lotIds: [],
    orderIds: [],
    locationIds: [],
    productIds: [],
  };

  try {
    await ensureManualInventoryMigration();
    await ensureClothingTableGrants();
    db = createServiceRoleClient();
    await assertSchema(db);
    console.log("→ Creating test product…");
    const product = await createProduct(db, {
      model: `${TEST_PREFIX} Camiseta`,
      brand: "hummel",
      category: "shirt_competition",
      color: "blanco",
      season: SEASON,
      notes: "Integration test product",
    });
    ids.productIds.push(product.id);

    console.log("→ Creating storage tree (armario → balda → caja)…");
    const cabinet = await createLocation(db, {
      parent_id: null,
      location_type: "cabinet",
      label: `${TEST_PREFIX} Armario`,
      code: `${TEST_PREFIX}-ARM`,
      season: SEASON,
    });
    ids.locationIds.push(cabinet.id);

    const shelf = await createLocation(db, {
      parent_id: cabinet.id,
      location_type: "shelf",
      label: `${TEST_PREFIX} Balda`,
      code: `${TEST_PREFIX}-BAL`,
      season: SEASON,
    });
    ids.locationIds.push(shelf.id);

    const box = await createLocation(db, {
      parent_id: shelf.id,
      location_type: "box",
      label: `${TEST_PREFIX} Caja`,
      code: `${TEST_PREFIX}-CAJ`,
      season: SEASON,
    });
    ids.locationIds.push(box.id);

    console.log("→ Manual stock without box…");
    const manualPending = await createManualInventoryLot(db, {
      product_id: product.id,
      size: "m",
      quantity: 5,
      notes: `${TEST_PREFIX} opening balance`,
    });
    ids.lotIds.push(manualPending.id);
    assert(manualPending.status === "pending_storage", "manual lot without box should be pending_storage");
    assert(manualPending.source_type === "manual", "manual lot source_type should be manual");
    assert(manualPending.source_order_id === null, "manual lot should have no source order");

    console.log("→ Manual stock with box…");
    const manualStored = await createManualInventoryLot(db, {
      product_id: product.id,
      size: "l",
      quantity: 3,
      storage_location_id: box.id,
      notes: `${TEST_PREFIX} stored manual`,
    });
    ids.lotIds.push(manualStored.id);
    assert(manualStored.status === "stored", "manual lot with box should be stored");
    assert(manualStored.storage_location_id === box.id, "manual lot should reference box");

    console.log("→ Supplier order full flow…");
    const { order, lines } = await createSupplierOrder(db, {
      reference: `${TEST_PREFIX}-PED-01`,
      supplier_name: `${TEST_PREFIX} Proveedor`,
      season: SEASON,
      lines: [{ product_id: product.id, size: "s", quantity_ordered: 10 }],
    });
    ids.orderIds.push(order.id);
    assert(order.status === "draft", "new order should be draft");

    await updateOrderStatus(db, order.id, "ordered");
    await updateOrderStatus(db, order.id, "received");
    await updateOrderLineReceived(db, lines[0]!.id, 10);
    await updateOrderStatus(db, order.id, "at_serigraphy");
    await updateOrderStatus(db, order.id, "returned_from_serigraphy");

    const lotsAfterOrder = await listInventoryLots(db);
    const orderLots = lotsAfterOrder.filter(
      (lot) => lot.source_order_id === order.id && !ids.lotIds.includes(lot.id),
    );
    assert(orderLots.length === 1, "order should generate one inventory lot");
    const orderLot = orderLots[0]!;
    ids.lotIds.push(orderLot.id);
    assert(orderLot.source_type === "order", "order lot source_type should be order");
    assert(orderLot.status === "pending_storage", "order lot should start pending_storage");

    console.log("→ Assign pending lot to box…");
    const assigned = await assignLotToLocation(db, manualPending.id, box.id);
    assert(assigned.status === "stored", "assigned lot should be stored");
    assert(assigned.storage_location_id === box.id, "assigned lot should be in box");

    console.log("→ Verifying inventory counts…");
    const allLots = await listInventoryLots(db);
    const testLots = allLots.filter((lot) => ids.lotIds.includes(lot.id));
    assert(testLots.length === 3, "expected 3 test lots total");

    const storedUnits = testLots
      .filter((lot) => lot.status === "stored")
      .reduce((sum, lot) => sum + lot.quantity, 0);
    assert(storedUnits === 3 + 5, "stored units should be manual stored (3) + assigned pending (5)");

    const { orders } = await listOrdersWithLines(db);
    const testOrder = orders.find((o) => o.id === order.id);
    assert(testOrder?.status === "returned_from_serigraphy", "order should be at returned_from_serigraphy");

    console.log("\n✓ All clothing DB integration checks passed.");
  } catch (e) {
    failed = true;
    console.error("\n✗ Test failed:", e instanceof Error ? e.message : e);
  } finally {
    if (db) {
      console.log("\n→ Cleaning up TEST-CLOTHING-* rows…");
      await cleanup(db, ids);
      try {
        const remaining = await listInventoryLots(db);
        const leftover = remaining.filter(
          (lot) =>
            lot.notes?.includes(TEST_PREFIX) ||
            ids.lotIds.includes(lot.id),
        );
        if (leftover.length > 0) {
          console.warn(`Warning: ${leftover.length} test lot(s) may remain — review manually.`);
        }
      } catch {
        // Schema may be incomplete during preflight failures.
      }
    }
  }

  if (failed) process.exit(1);
}

main();
