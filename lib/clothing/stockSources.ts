import { collectBoxHomes } from "@/lib/clothing/storageBoxes";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import type {
  ClothingInventoryLotWithDetails,
  ClothingProduct,
  ClothingSize,
  ClothingStorageLocationNode,
} from "@/lib/types/db";

export const PENDING_STOCK_LOCATION = "pending";

export type StockPool = {
  productId: string;
  size: ClothingSize;
  storageLocationId: string | null;
  jerseyNumber: number | null;
  box: ClothingStorageLocationNode | null;
  home: string;
  quantity: number;
  lots: ClothingInventoryLotWithDetails[];
};

export function stockPoolKey(
  productId: string,
  size: ClothingSize,
  storageLocationId: string | null,
  jerseyNumber: number | null = null,
): string {
  return `${productId}::${size}::${storageLocationId ?? PENDING_STOCK_LOCATION}::${jerseyNumber ?? "none"}`;
}

export function buildStockPools(
  lots: ClothingInventoryLotWithDetails[],
  tree: ClothingStorageLocationNode[],
): StockPool[] {
  const homeByBoxId = new Map(collectBoxHomes(tree).map((home) => [home.box.id, home]));
  const pools = new Map<string, StockPool>();

  for (const lot of lots) {
    if (lot.quantity <= 0) continue;
    const key = stockPoolKey(lot.product_id, lot.size, lot.storage_location_id, lot.jersey_number);
    const existing = pools.get(key);
    if (existing) {
      existing.quantity += lot.quantity;
      existing.lots.push(lot);
      continue;
    }

    const home = lot.storage_location_id ? (homeByBoxId.get(lot.storage_location_id) ?? null) : null;
    pools.set(key, {
      productId: lot.product_id,
      size: lot.size,
      storageLocationId: lot.storage_location_id,
      jerseyNumber: lot.jersey_number,
      box: home?.box ?? null,
      home: home
        ? [home.cabinet?.label, `${home.box.code} · ${home.box.label}`].filter(Boolean).join(" › ")
        : "Por ubicar",
      quantity: lot.quantity,
      lots: [lot],
    });
  }

  const list = [...pools.values()];
  for (const pool of list) {
    pool.lots.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  }

  return list.sort((a, b) => {
    const productCmp = formatProductShort(a.lots[0]!.product).localeCompare(
      formatProductShort(b.lots[0]!.product),
      "es",
    );
    if (productCmp !== 0) return productCmp;
    const sizeCmp = formatClothingSize(a.size).localeCompare(formatClothingSize(b.size), "es");
    if (sizeCmp !== 0) return sizeCmp;
    const jerseyA = a.jerseyNumber ?? -1;
    const jerseyB = b.jerseyNumber ?? -1;
    if (jerseyA !== jerseyB) return jerseyA - jerseyB;
    return a.home.localeCompare(b.home, "es");
  });
}

export function poolsInLocation(
  pools: StockPool[],
  storageLocationId: string | null,
): StockPool[] {
  return pools.filter((pool) => pool.storageLocationId === storageLocationId);
}

export function sourcesForSku(
  pools: StockPool[],
  productId: string,
  size: ClothingSize,
  jerseyNumber: number | null = null,
): StockPool[] {
  return pools.filter(
    (pool) =>
      pool.productId === productId &&
      pool.size === size &&
      pool.jerseyNumber === jerseyNumber,
  );
}

export function productsWithStock(
  pools: StockPool[],
  products: ClothingProduct[],
): ClothingProduct[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  const result: ClothingProduct[] = [];
  const seen = new Set<string>();
  for (const pool of pools) {
    if (seen.has(pool.productId)) continue;
    seen.add(pool.productId);
    const product = byId.get(pool.productId) ?? pool.lots[0]?.product;
    if (product) result.push(product);
  }
  return result.sort((a, b) =>
    formatProductShort(a).localeCompare(formatProductShort(b), "es"),
  );
}

export function sizesWithStock(pools: StockPool[], productId: string): ClothingSize[] {
  const sizes = new Set<ClothingSize>();
  for (const pool of pools) {
    if (pool.productId === productId) sizes.add(pool.size);
  }
  return [...sizes];
}

export function formatPoolSource(pool: StockPool): string {
  if (!pool.box) return "Por ubicar";
  return pool.home;
}
