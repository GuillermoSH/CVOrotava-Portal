import type {
  ClothingInventoryLot,
  ClothingInventorySourceType,
  ClothingOrderStatus,
  ClothingProduct,
  ClothingProductBrand,
  ClothingProductCategory,
  ClothingProductColor,
  ClothingSize,
  ClothingStorageLocation,
  ClothingSupplierOrder,
  ClothingSupplierOrderLine,
} from "@/lib/types/db";

type ProductRow = {
  id: string;
  model: string;
  brand: string;
  category: string;
  color: string;
  season: string;
  is_active: boolean;
  is_shop_item: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type OrderRow = {
  id: string;
  reference: string;
  supplier_name: string;
  season: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type OrderLineRow = {
  id: string;
  order_id: string;
  product_id: string;
  size: string;
  quantity_ordered: number;
  quantity_received: number;
  created_at: string;
};

type LocationRow = {
  id: string;
  parent_id: string | null;
  location_type: string;
  label: string;
  code: string;
  season: string;
  sort_order: number;
  notes: string | null;
  created_at: string;
};

type LotRow = {
  id: string;
  product_id: string;
  size: string;
  quantity: number;
  status: string;
  storage_location_id: string | null;
  source_order_id: string | null;
  source_line_id: string | null;
  source_type: string;
  notes: string | null;
  returned_from_serigraphy_at: string | null;
  created_at: string;
  updated_at: string;
};

export function mapProduct(row: ProductRow): ClothingProduct {
  return {
    id: row.id,
    model: row.model,
    brand: row.brand as ClothingProductBrand,
    category: row.category as ClothingProductCategory,
    color: row.color as ClothingProductColor,
    season: row.season,
    is_active: row.is_active,
    is_shop_item: row.is_shop_item ?? false,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapOrder(row: OrderRow): ClothingSupplierOrder {
  return {
    id: row.id,
    reference: row.reference,
    supplier_name: row.supplier_name,
    season: row.season,
    status: row.status as ClothingOrderStatus,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapOrderLine(row: OrderLineRow): ClothingSupplierOrderLine {
  return {
    id: row.id,
    order_id: row.order_id,
    product_id: row.product_id,
    size: row.size as ClothingSize,
    quantity_ordered: row.quantity_ordered,
    quantity_received: row.quantity_received,
    created_at: row.created_at,
  };
}

export function mapLocation(row: LocationRow): ClothingStorageLocation {
  return {
    id: row.id,
    parent_id: row.parent_id,
    location_type: row.location_type as ClothingStorageLocation["location_type"],
    label: row.label,
    code: row.code,
    season: row.season,
    sort_order: row.sort_order,
    notes: row.notes,
    created_at: row.created_at,
  };
}

export function mapLot(row: LotRow): ClothingInventoryLot {
  return {
    id: row.id,
    product_id: row.product_id,
    size: row.size as ClothingSize,
    quantity: row.quantity,
    status: row.status as ClothingInventoryLot["status"],
    storage_location_id: row.storage_location_id,
    source_order_id: row.source_order_id,
    source_line_id: row.source_line_id,
    source_type: row.source_type as ClothingInventorySourceType,
    notes: row.notes,
    returned_from_serigraphy_at: row.returned_from_serigraphy_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export type { ProductRow, OrderRow, OrderLineRow, LocationRow, LotRow };
