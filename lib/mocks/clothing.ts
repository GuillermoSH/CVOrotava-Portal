import { getCurrentSeason } from "@/lib/season";
import type {
  ClothingInventoryLot,
  ClothingProduct,
  ClothingStorageLocation,
  ClothingSupplierOrder,
  ClothingSupplierOrderLine,
} from "@/lib/types/db";

const now = () => new Date().toISOString();

export const mockProducts: ClothingProduct[] = [
  {
    id: "a1000001-0000-4000-8000-000000000001",
    model: "Hummel Pro",
    brand: "hummel",
    category: "shirt_competition",
    color: "rojo",
    season: getCurrentSeason(),
    is_active: true,
    is_shop_item: false,
    notes: "Serigrafía club",
    created_at: "2026-01-10T10:00:00.000Z",
    updated_at: "2026-01-10T10:00:00.000Z",
  },
  {
    id: "a1000001-0000-4000-8000-000000000002",
    model: "Hummel Core",
    brand: "hummel",
    category: "pants_short",
    color: "negro",
    season: getCurrentSeason(),
    is_active: true,
    is_shop_item: false,
    notes: null,
    created_at: "2026-01-10T10:00:00.000Z",
    updated_at: "2026-01-10T10:00:00.000Z",
  },
  {
    id: "a1000001-0000-4000-8000-000000000003",
    model: "Hummel Warm",
    brand: "hummel",
    category: "jacket",
    color: "blanco",
    season: getCurrentSeason(),
    is_active: true,
    is_shop_item: false,
    notes: null,
    created_at: "2026-01-10T10:00:00.000Z",
    updated_at: "2026-01-10T10:00:00.000Z",
  },
  {
    id: "a1000001-0000-4000-8000-000000000004",
    model: "Club Pack",
    brand: "hummel",
    category: "backpack",
    color: "negro",
    season: getCurrentSeason(),
    is_active: true,
    is_shop_item: false,
    notes: null,
    created_at: "2026-01-10T10:00:00.000Z",
    updated_at: "2026-01-10T10:00:00.000Z",
  },
];

export const mockOrders: ClothingSupplierOrder[] = [
  {
    id: "b2000001-0000-4000-8000-000000000001",
    reference: "PED-2026-01",
    supplier_name: "Deportextil Canarias",
    season: getCurrentSeason(),
    status: "at_serigraphy",
    notes: "Entrega prevista semana 12",
    created_at: "2026-02-01T09:00:00.000Z",
    updated_at: "2026-03-15T14:00:00.000Z",
  },
  {
    id: "b2000001-0000-4000-8000-000000000002",
    reference: "PED-2026-02",
    supplier_name: "Volley Gear SL",
    season: getCurrentSeason(),
    status: "ordered",
    notes: null,
    created_at: "2026-03-01T11:00:00.000Z",
    updated_at: "2026-03-05T16:30:00.000Z",
  },
  {
    id: "b2000001-0000-4000-8000-000000000003",
    reference: "PED-2025-18",
    supplier_name: "Deportextil Canarias",
    season: getCurrentSeason(),
    status: "returned_from_serigraphy",
    notes: "Pendiente ubicar en almacén",
    created_at: "2025-11-20T08:00:00.000Z",
    updated_at: "2026-01-28T10:00:00.000Z",
  },
  {
    id: "b2000001-0000-4000-8000-000000000004",
    reference: "PED-2025-12",
    supplier_name: "Textil Norte",
    season: getCurrentSeason(),
    status: "closed",
    notes: null,
    created_at: "2025-10-01T08:00:00.000Z",
    updated_at: "2025-12-20T17:00:00.000Z",
  },
];

export const mockOrderLines: ClothingSupplierOrderLine[] = [
  {
    id: "c3000001-0000-4000-8000-000000000001",
    order_id: "b2000001-0000-4000-8000-000000000001",
    product_id: "a1000001-0000-4000-8000-000000000001",
    size: "m",
    quantity_ordered: 24,
    quantity_received: 24,
    created_at: "2026-02-01T09:00:00.000Z",
  },
  {
    id: "c3000001-0000-4000-8000-000000000002",
    order_id: "b2000001-0000-4000-8000-000000000001",
    product_id: "a1000001-0000-4000-8000-000000000001",
    size: "l",
    quantity_ordered: 18,
    quantity_received: 18,
    created_at: "2026-02-01T09:00:00.000Z",
  },
  {
    id: "c3000001-0000-4000-8000-000000000003",
    order_id: "b2000001-0000-4000-8000-000000000002",
    product_id: "a1000001-0000-4000-8000-000000000002",
    size: "s",
    quantity_ordered: 15,
    quantity_received: 0,
    created_at: "2026-03-01T11:00:00.000Z",
  },
  {
    id: "c3000001-0000-4000-8000-000000000004",
    order_id: "b2000001-0000-4000-8000-000000000003",
    product_id: "a1000001-0000-4000-8000-000000000003",
    size: "m",
    quantity_ordered: 10,
    quantity_received: 10,
    created_at: "2025-11-20T08:00:00.000Z",
  },
  {
    id: "c3000001-0000-4000-8000-000000000005",
    order_id: "b2000001-0000-4000-8000-000000000004",
    product_id: "a1000001-0000-4000-8000-000000000004",
    size: "one_size",
    quantity_ordered: 20,
    quantity_received: 20,
    created_at: "2025-10-01T08:00:00.000Z",
  },
];

export const mockLocations: ClothingStorageLocation[] = [
  {
    id: "d4000001-0000-4000-8000-000000000001",
    parent_id: null,
    location_type: "cabinet",
    label: "Armario A",
    code: "ARM-A",
    season: getCurrentSeason(),
    sort_order: 0,
    notes: null,
    created_at: "2026-01-05T10:00:00.000Z",
  },
  {
    id: "d4000001-0000-4000-8000-000000000002",
    parent_id: "d4000001-0000-4000-8000-000000000001",
    location_type: "shelf",
    label: "Balda 3",
    code: "BAL-3",
    season: getCurrentSeason(),
    sort_order: 0,
    notes: null,
    created_at: "2026-01-05T10:05:00.000Z",
  },
  {
    id: "d4000001-0000-4000-8000-000000000003",
    parent_id: "d4000001-0000-4000-8000-000000000002",
    location_type: "box",
    label: "Caja 12",
    code: "CAJ-12",
    season: getCurrentSeason(),
    sort_order: 0,
    notes: null,
    created_at: "2026-01-05T10:10:00.000Z",
  },
  {
    id: "d4000001-0000-4000-8000-000000000004",
    parent_id: null,
    location_type: "cabinet",
    label: "Armario B",
    code: "ARM-B",
    season: getCurrentSeason(),
    sort_order: 1,
    notes: null,
    created_at: "2026-01-06T10:00:00.000Z",
  },
  {
    id: "d4000001-0000-4000-8000-000000000005",
    parent_id: null,
    location_type: "box",
    label: "Calentamiento",
    code: "CAJ-01",
    season: getCurrentSeason(),
    sort_order: 0,
    notes: null,
    created_at: "2026-02-01T10:00:00.000Z",
  },
];

export const mockInventoryLots: ClothingInventoryLot[] = [
  {
    id: "e5000001-0000-4000-8000-000000000001",
    product_id: "a1000001-0000-4000-8000-000000000003",
    size: "m",
    quantity: 10,
    status: "pending_storage",
    storage_location_id: null,
    source_order_id: "b2000001-0000-4000-8000-000000000003",
    source_line_id: "c3000001-0000-4000-8000-000000000004",
    source_type: "order",
    notes: null,
    returned_from_serigraphy_at: "2026-01-28T10:00:00.000Z",
    created_at: "2026-01-28T10:00:00.000Z",
    updated_at: "2026-01-28T10:00:00.000Z",
  },
  {
    id: "e5000001-0000-4000-8000-000000000002",
    product_id: "a1000001-0000-4000-8000-000000000004",
    size: "one_size",
    quantity: 20,
    status: "stored",
    storage_location_id: "d4000001-0000-4000-8000-000000000003",
    source_order_id: "b2000001-0000-4000-8000-000000000004",
    source_line_id: "c3000001-0000-4000-8000-000000000005",
    source_type: "order",
    notes: null,
    returned_from_serigraphy_at: "2025-12-01T10:00:00.000Z",
    created_at: "2025-12-01T10:00:00.000Z",
    updated_at: "2025-12-15T14:00:00.000Z",
  },
];

/** Mutable in-memory store for dev server actions (resets on restart). */
function cloneSeed<T>(items: T[]): T[] {
  return structuredClone(items);
}

export const clothingMockStore = {
  products: cloneSeed(mockProducts),
  orders: cloneSeed(mockOrders),
  orderLines: cloneSeed(mockOrderLines),
  locations: cloneSeed(mockLocations),
  inventoryLots: cloneSeed(mockInventoryLots),
  nextOrderRef: 3,
};

export function generateMockId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function touchTimestamp() {
  return now();
}

export function nextOrderReference(season: string): string {
  const year = season.split("-")[0] ?? "2026";
  const ref = `PED-${year}-${String(clothingMockStore.nextOrderRef).padStart(2, "0")}`;
  clothingMockStore.nextOrderRef += 1;
  return ref;
}
