import "server-only";

import { computePossessionFromMovements, filterPossessionBySeason } from "@/lib/clothing/possession";
import { getClothingDb } from "@/lib/clothing/repository/client";
import {
  buildLocationPath,
  buildStorageTreeFromFlat,
  productMapFromList,
} from "@/lib/clothing/repository/helpers";
import {
  listInventoryLots,
  listPlayerStockMovements,
  listStockMovements,
} from "@/lib/clothing/repository/inventory";
import { listLocations } from "@/lib/clothing/repository/locations";
import {
  listOrdersWithLines,
  listOrderStatusEvents,
} from "@/lib/clothing/repository/orders";
import { listActivePlayers } from "@/lib/clothing/repository/players";
import { listActiveProducts, listProducts } from "@/lib/clothing/repository/products";
import type {
  ClothingDeliveryHistoryItem,
  ClothingInventoryLotWithDetails,
  ClothingOrderLineWithProduct,
  ClothingOrderWithLines,
  ClothingOrderWithLinesAndEvents,
  ClothingPossessionItem,
  ClothingProduct,
  ClothingStorageLocationNode,
  PlayerWithTeam,
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

export async function getRosterSnapshot(): Promise<PlayerWithTeam[]> {
  const db = await getClothingDb();
  return listActivePlayers(db);
}
