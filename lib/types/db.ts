/**
 * Placeholder domain types until Supabase migrations + generated types exist.
 * Do not store real member data in mocks committed to the repo.
 */

import type { UserRole } from "@/lib/constants";

export type PaymentMethod = "transfer" | "cash";

export type Profile = {
  id: string;
  role: UserRole;
  display_name: string | null;
};

/** supabase/migrations/20260831120000_portal_access_and_roster.sql */
export type Team = {
  id: string;
  name: string;
  category: string;
  gender: "male" | "female";
  season: string;
};

export type Player = {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  team_id: string | null;
  /** Set when the player has their own login (senior players). */
  user_id: string | null;
  season: string;
  is_active: boolean;
  dni: string | null;
  license_completed: boolean;
  registration_papers_received: boolean;
  docs_delivered_to_family: boolean;
  docs_delivered_at: string | null;
  photo_taken: boolean;
  photo_consent: boolean;
  /** Path en bucket player-photos; uso interno / federativa (≠ photo_consent). */
  photo_path: string | null;
  in_whatsapp_group: boolean;
  medical_notes: string | null;
  clothing_size: ClothingSize | null;
  address: string | null;
  address_street_type: string | null;
  address_street: string | null;
  address_number: string | null;
  address_door: string | null;
  address_postal_code: string | null;
  address_municipality: string | null;
  address_province: string | null;
  birth_country: string | null;
  nationality: string | null;
  /** Cuota mensual ampliada (30 €) en categorías base; default false = 25 €. */
  pays_extended_monthly: boolean;
};

export type PlayerGuardian = {
  id: string;
  player_id: string;
  guardian_user_id: string;
  relationship: string | null;
};

export type PlayerContactRelationship = "madre" | "padre" | "tutor" | "otro" | "jugador";

export type PlayerContact = {
  id: string;
  player_id: string;
  full_name: string;
  relationship: PlayerContactRelationship;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  portal_user_id: string | null;
};

export type PlayerWithTeam = Player & {
  team: Team | null;
};

/** Lista admin: jugador + equipo + teléfono/email del contacto primario. */
export type PlayerListItem = PlayerWithTeam & {
  primary_phone: string | null;
  primary_email: string | null;
};

export type PlayerWithDetails = PlayerWithTeam & {
  contacts: PlayerContact[];
};

export type UserAppRole = {
  id: string;
  user_id: string;
  app: "team_manager" | "portal";
  role: UserRole;
};

export type Payment = {
  id: string;
  parent_id: string;
  concept: string;
  amount_cents: number;
  method: PaymentMethod;
  paid_at: string | null;
  notes: string | null;
};

/** supabase/migrations/20260831130000_clothing_warehouse.sql */

export type ClothingProductCategory =
  | "shirt_warmup"
  | "shirt_competition"
  | "jacket"
  | "pants_short"
  | "shorts"
  | "sweatshirt"
  | "pants_long"
  | "backpack"
  | "socks";

export type ClothingProductColor =
  | "blanco"
  | "negro"
  | "rojo"
  | "rojo_blanco"
  | "negro_blanco"
  | "rojo_negro";

export type ClothingProductBrand = "hummel" | "aqua_royal" | "joma" | "errea";

export type ClothingOrderStatus =
  | "draft"
  | "ordered"
  | "received"
  | "at_serigraphy"
  | "returned_from_serigraphy"
  | "closed";

export type ClothingLocationType = "cabinet" | "shelf" | "box";

export type ClothingInventoryStatus = "pending_storage" | "stored";

export type ClothingInventorySourceType = "order" | "manual";

export type ClothingStockMovementKind = "delivery" | "write_off" | "return";

/** Matches `clothing_size` enum in Supabase. */
export type ClothingSize =
  | "xxs"
  | "xs"
  | "s"
  | "m"
  | "l"
  | "xl"
  | "xxl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "104"
  | "110"
  | "116"
  | "122"
  | "128"
  | "134"
  | "140"
  | "146"
  | "152"
  | "164"
  | "176"
  | "one_size";

export type ClothingProduct = {
  id: string;
  model: string;
  brand: ClothingProductBrand;
  category: ClothingProductCategory;
  color: ClothingProductColor;
  season: string;
  is_active: boolean;
  is_shop_item: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ClothingSupplierOrder = {
  id: string;
  reference: string;
  supplier_name: string;
  season: string;
  status: ClothingOrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ClothingSupplierOrderStatusEvent = {
  id: string;
  order_id: string;
  status: ClothingOrderStatus;
  changed_at: string;
  changed_by: string | null;
};

export type ClothingSupplierOrderLine = {
  id: string;
  order_id: string;
  product_id: string;
  size: ClothingSize;
  quantity_ordered: number;
  quantity_received: number;
  created_at: string;
};

export type ClothingStorageLocation = {
  id: string;
  parent_id: string | null;
  location_type: ClothingLocationType;
  label: string;
  code: string;
  season: string;
  sort_order: number;
  notes: string | null;
  created_at: string;
};

export type ClothingInventoryLot = {
  id: string;
  product_id: string;
  size: ClothingSize;
  quantity: number;
  status: ClothingInventoryStatus;
  storage_location_id: string | null;
  source_order_id: string | null;
  source_line_id: string | null;
  source_type: ClothingInventorySourceType;
  notes: string | null;
  returned_from_serigraphy_at: string | null;
  jersey_number: number | null;
  created_at: string;
  updated_at: string;
};

/** Enriched types for UI snapshots */

export type ClothingOrderLineWithProduct = ClothingSupplierOrderLine & {
  product: ClothingProduct;
};

export type ClothingOrderWithLines = ClothingSupplierOrder & {
  lines: ClothingOrderLineWithProduct[];
};

export type ClothingOrderWithLinesAndEvents = ClothingOrderWithLines & {
  status_events: ClothingSupplierOrderStatusEvent[];
};

export type ClothingInventoryLotWithDetails = ClothingInventoryLot & {
  product: ClothingProduct;
  location_path: string | null;
};

export type ClothingStockMovement = {
  id: string;
  kind: ClothingStockMovementKind;
  lot_id: string | null;
  product_id: string;
  size: ClothingSize;
  quantity: number;
  recipient_name: string | null;
  notes: string | null;
  created_by: string | null;
  jersey_number: number | null;
  player_id: string | null;
  related_movement_id: string | null;
  created_at: string;
};

export type ClothingDeliveryHistoryItem = ClothingStockMovement & {
  product: ClothingProduct;
  player_name: string;
};

/** Open delivery line still held by a player (delivered − returned). */
export type ClothingPossessionItem = {
  delivery_id: string;
  player_id: string;
  player_name: string;
  product_id: string;
  product: ClothingProduct;
  size: ClothingSize;
  jersey_number: number | null;
  quantity: number;
  delivered_at: string;
};

export type ClothingStorageLocationNode = ClothingStorageLocation & {
  children: ClothingStorageLocationNode[];
};
