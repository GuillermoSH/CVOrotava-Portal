import "server-only";

import { getClothingDb } from "@/lib/clothing/repository/client";
import {
  buildLocationPath,
  buildStorageTreeFromFlat,
  productMapFromList,
} from "@/lib/clothing/repository/helpers";
import { listInventoryLots } from "@/lib/clothing/repository/inventory";
import { listLocations } from "@/lib/clothing/repository/locations";
import { listOrdersWithLines } from "@/lib/clothing/repository/orders";
import { listActiveProducts, listProducts } from "@/lib/clothing/repository/products";
import type {
  ClothingInventoryLotWithDetails,
  ClothingOrderLineWithProduct,
  ClothingOrderWithLines,
  ClothingProduct,
  ClothingStorageLocationNode,
} from "@/lib/types/db";

function enrichOrderLines(
  lines: Awaited<ReturnType<typeof listOrdersWithLines>>["lines"],
  productMap: Map<string, ClothingProduct>,
): ClothingOrderLineWithProduct[] {
  return lines
    .map((line) => {
      const product = productMap.get(line.product_id);
      if (!product) return null;
      return { ...line, product };
    })
    .filter((line): line is ClothingOrderLineWithProduct => line !== null);
}

export async function enrichOrders(): Promise<ClothingOrderWithLines[]> {
  const db = await getClothingDb();
  const [{ orders, lines }, products] = await Promise.all([
    listOrdersWithLines(db),
    listProducts(db),
  ]);
  const productMap = productMapFromList(products);

  return orders
    .map((order) => ({
      ...order,
      lines: enrichOrderLines(
        lines.filter((l) => l.order_id === order.id),
        productMap,
      ),
    }))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getOrderById(orderId: string): Promise<ClothingOrderWithLines | null> {
  const orders = await enrichOrders();
  return orders.find((o) => o.id === orderId) ?? null;
}

export async function enrichInventory(): Promise<ClothingInventoryLotWithDetails[]> {
  const db = await getClothingDb();
  const [lots, products, locations] = await Promise.all([
    listInventoryLots(db),
    listProducts(db),
    listLocations(db),
  ]);
  const productMap = productMapFromList(products);

  return lots
    .map((lot) => {
      const product = productMap.get(lot.product_id);
      if (!product) return null;
      return {
        ...lot,
        product,
        location_path: buildLocationPath(lot.storage_location_id, locations),
      };
    })
    .filter((lot): lot is ClothingInventoryLotWithDetails => lot !== null)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function buildStorageTree(season?: string): Promise<ClothingStorageLocationNode[]> {
  const db = await getClothingDb();
  const locations = await listLocations(db, season);
  return buildStorageTreeFromFlat(locations);
}

export type ClothingHubKpis = {
  openOrders: number;
  pendingStorageLots: number;
  storedUnits: number;
  pendingStorageUnits: number;
};

export async function getClothingHubKpis(): Promise<ClothingHubKpis> {
  const db = await getClothingDb();
  const [{ orders }, lots] = await Promise.all([listOrdersWithLines(db), listInventoryLots(db)]);

  const openOrders = orders.filter((o) => o.status !== "closed").length;
  const pendingLots = lots.filter((l) => l.status === "pending_storage");
  const storedLots = lots.filter((l) => l.status === "stored");

  return {
    openOrders,
    pendingStorageLots: pendingLots.length,
    storedUnits: storedLots.reduce((sum, l) => sum + l.quantity, 0),
    pendingStorageUnits: pendingLots.reduce((sum, l) => sum + l.quantity, 0),
  };
}

export async function getProductsSnapshot(): Promise<ClothingProduct[]> {
  const db = await getClothingDb();
  return listActiveProducts(db);
}

export async function getAllProductsSnapshot(): Promise<ClothingProduct[]> {
  const db = await getClothingDb();
  const products = await listProducts(db);
  return [...products].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return a.model.localeCompare(b.model, "es");
  });
}
