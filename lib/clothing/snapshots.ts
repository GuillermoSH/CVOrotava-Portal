import "server-only";

import { getCachedInventorySnapshot } from "@/lib/clothing/cached-inventory";
import { getCachedOrdersSnapshot } from "@/lib/clothing/cached-orders";
import {
  getCachedActiveProductsSnapshot,
  getCachedAllProductsSnapshot,
} from "@/lib/clothing/cached-products";
import { computePossessionFromMovements, filterPossessionBySeason } from "@/lib/clothing/possession";
import { getClothingDb } from "@/lib/clothing/repository/client";
import {
  buildStorageTreeFromFlat,
  productMapFromList,
} from "@/lib/clothing/repository/helpers";
import {
  listPlayerStockMovements,
  listStockMovements,
} from "@/lib/clothing/repository/inventory";
import { listLocations } from "@/lib/clothing/repository/locations";
import { listOrderStatusEvents } from "@/lib/clothing/repository/orders";
import { listActivePlayers } from "@/lib/clothing/repository/players";
import { listProducts } from "@/lib/clothing/repository/products";
import type {
  ClothingDeliveryHistoryItem,
  ClothingInventoryLotWithDetails,
  ClothingOrderWithLines,
  ClothingOrderWithLinesAndEvents,
  ClothingPossessionItem,
  ClothingProduct,
  ClothingStorageLocationNode,
  PlayerWithTeam,
} from "@/lib/types/db";

export async function enrichOrders(): Promise<ClothingOrderWithLines[]> {
  return getCachedOrdersSnapshot();
}

export async function getOrderById(
  orderId: string,
): Promise<ClothingOrderWithLinesAndEvents | null> {
  const orders = await enrichOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return null;

  const db = await getClothingDb();
  const status_events = await listOrderStatusEvents(db, orderId);
  return { ...order, status_events };
}

export async function enrichInventory(): Promise<ClothingInventoryLotWithDetails[]> {
  return getCachedInventorySnapshot();
}

export async function enrichDeliveryHistory(): Promise<ClothingDeliveryHistoryItem[]> {
  const db = await getClothingDb();
  const [movements, products, players] = await Promise.all([
    listStockMovements(db, ["delivery", "return"]),
    listProducts(db),
    listActivePlayers(db),
  ]);
  const productMap = productMapFromList(products);
  const playerNameById = new Map(players.map((player) => [player.id, player.full_name]));

  return movements
    .map((movement) => {
      const product = productMap.get(movement.product_id);
      if (!product) return null;
      const playerName =
        (movement.player_id ? playerNameById.get(movement.player_id) : null) ??
        movement.recipient_name ??
        "Sin nombre";
      return {
        ...movement,
        product,
        player_name: playerName,
      };
    })
    .filter((item): item is ClothingDeliveryHistoryItem => item !== null);
}

export async function enrichPossession(
  season: string | "all" = "all",
): Promise<ClothingPossessionItem[]> {
  const db = await getClothingDb();
  const [movements, products, players] = await Promise.all([
    listStockMovements(db, ["delivery", "return"]),
    listProducts(db),
    listActivePlayers(db),
  ]);
  const productMap = productMapFromList(products);
  const playerNameById = new Map(players.map((player) => [player.id, player.full_name]));
  const items = computePossessionFromMovements(movements, productMap, playerNameById);
  return filterPossessionBySeason(items, season);
}

export async function enrichPlayerClothing(
  playerId: string,
  season: string | "all" = "all",
): Promise<{
  possession: ClothingPossessionItem[];
  history: ClothingDeliveryHistoryItem[];
}> {
  const db = await getClothingDb();
  const [movements, products, players] = await Promise.all([
    listPlayerStockMovements(db, playerId, ["delivery", "return"]),
    listProducts(db),
    listActivePlayers(db),
  ]);
  const productMap = productMapFromList(products);
  const playerNameById = new Map(players.map((player) => [player.id, player.full_name]));

  const history = movements
    .map((movement) => {
      const product = productMap.get(movement.product_id);
      if (!product) return null;
      const playerName =
        (movement.player_id ? playerNameById.get(movement.player_id) : null) ??
        movement.recipient_name ??
        "Sin nombre";
      return {
        ...movement,
        product,
        player_name: playerName,
      };
    })
    .filter((item): item is ClothingDeliveryHistoryItem => item !== null);

  const filteredHistory =
    season === "all"
      ? history
      : history.filter((item) => item.product.season === season);

  const possession = filterPossessionBySeason(
    computePossessionFromMovements(movements, productMap, playerNameById),
    season,
  );

  return { possession, history: filteredHistory };
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
  featuredOpenOrder: {
    id: string;
    reference: string;
    supplier_name: string;
    status: ClothingOrderWithLines["status"];
  } | null;
};

/** KPIs del hub ropa — derivados de snapshots cacheados (sin cookies). Auth en la página. */
export async function getClothingHubKpis(): Promise<ClothingHubKpis> {
  const [orders, lots] = await Promise.all([
    getCachedOrdersSnapshot(),
    getCachedInventorySnapshot(),
  ]);

  const open = orders.filter((o) => o.status !== "closed");
  const featured = open[0] ?? null;
  const pendingLots = lots.filter((l) => l.status === "pending_storage");
  const storedLots = lots.filter((l) => l.status === "stored");

  return {
    openOrders: open.length,
    pendingStorageLots: pendingLots.length,
    storedUnits: storedLots.reduce((sum, l) => sum + l.quantity, 0),
    pendingStorageUnits: pendingLots.reduce((sum, l) => sum + l.quantity, 0),
    featuredOpenOrder: featured
      ? {
          id: featured.id,
          reference: featured.reference,
          supplier_name: featured.supplier_name,
          status: featured.status,
        }
      : null,
  };
}

export async function getProductsSnapshot(): Promise<ClothingProduct[]> {
  return getCachedActiveProductsSnapshot();
}

export async function getAllProductsSnapshot(): Promise<ClothingProduct[]> {
  return getCachedAllProductsSnapshot();
}

export async function getRosterSnapshot(): Promise<PlayerWithTeam[]> {
  const db = await getClothingDb();
  return listActivePlayers(db);
}
