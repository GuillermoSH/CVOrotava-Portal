import { getCurrentSeason } from "@/lib/season";

export const CLOTHING_CATEGORIES = [
  "shirt_warmup",
  "shirt_competition",
  "jacket",
  "pants_short",
  "shorts",
  "sweatshirt",
  "pants_long",
  "backpack",
  "socks",
] as const;

export type ClothingCategory = (typeof CLOTHING_CATEGORIES)[number];

export const CLOTHING_CATEGORY_LABELS: Record<ClothingCategory, string> = {
  shirt_warmup: "Camiseta calentamiento",
  shirt_competition: "Camiseta competición",
  jacket: "Chaqueta",
  pants_short: "Pantalón corto",
  shorts: "Malla corta",
  sweatshirt: "Sudadera",
  pants_long: "Pantalón largo",
  backpack: "Mochila",
  socks: "Calcetines",
};

export const CLOTHING_SOLID_COLORS = ["negro", "rojo", "blanco"] as const;

export type ClothingSolidColorName = (typeof CLOTHING_SOLID_COLORS)[number];

export const CLOTHING_COLORS = [
  "negro",
  "rojo",
  "blanco",
  "rojo_blanco",
  "negro_blanco",
  "rojo_negro",
] as const;

export type ClothingColorName = (typeof CLOTHING_COLORS)[number];

export const CLOTHING_COLOR_LABELS: Record<ClothingColorName, string> = {
  blanco: "Blanco",
  negro: "Negro",
  rojo: "Rojo",
  rojo_blanco: "Rojo/Blanco",
  negro_blanco: "Negro/Blanco",
  rojo_negro: "Rojo/Negro",
};

export function isClothingComboColor(
  color: ClothingColorName,
): color is "rojo_blanco" | "negro_blanco" | "rojo_negro" {
  return color.includes("_");
}

export function parseClothingComboColor(
  color: ClothingColorName,
): [ClothingSolidColorName, ClothingSolidColorName] | null {
  if (!isClothingComboColor(color)) return null;
  const [first, second] = color.split("_") as [ClothingSolidColorName, ClothingSolidColorName];
  return [first, second];
}

export const CLOTHING_BRANDS = ["hummel", "aqua_royal", "joma", "errea"] as const;

export type ClothingBrandName = (typeof CLOTHING_BRANDS)[number];

export const CLOTHING_BRAND_LABELS: Record<ClothingBrandName, string> = {
  hummel: "Hummel",
  aqua_royal: "Aqua Royal",
  joma: "Joma",
  errea: "Errea",
};

export const ORDER_STATUSES = [
  "draft",
  "ordered",
  "received",
  "at_serigraphy",
  "returned_from_serigraphy",
  "closed",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Borrador",
  ordered: "Pedido enviado",
  received: "Recibido",
  at_serigraphy: "En serigrafía",
  returned_from_serigraphy: "Vuelta serigrafía",
  closed: "Cerrado",
};

/** Kanban columns (excludes closed). */
export const KANBAN_STATUSES: OrderStatus[] = [
  "draft",
  "ordered",
  "received",
  "at_serigraphy",
  "returned_from_serigraphy",
];

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["ordered"],
  ordered: ["received"],
  received: ["at_serigraphy"],
  at_serigraphy: ["returned_from_serigraphy"],
  returned_from_serigraphy: ["closed"],
  closed: [],
};

export const LOCATION_TYPES = ["cabinet", "shelf", "box"] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  cabinet: "Armario",
  shelf: "Balda",
  box: "Caja",
};

export const INVENTORY_STATUSES = ["pending_storage", "stored"] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  pending_storage: "Pendiente ubicar",
  stored: "En almacén",
};

export const INVENTORY_SOURCE_LABELS = {
  manual: "Manual",
  order: "Pedido",
} as const;

/** Active club season at module load. Prefer `getCurrentSeason()` in forms. */
export const CURRENT_SEASON = getCurrentSeason();

/** Alias for kanban column statuses. */
export const CLOTHING_KANBAN_STATUSES = KANBAN_STATUSES;

/** Alias for transition map. */
export const ORDER_STATUS_TRANSITIONS = ORDER_TRANSITIONS;

/** Alias for product category labels. */
export const PRODUCT_CATEGORY_LABELS = CLOTHING_CATEGORY_LABELS;

/** Adult letter sizes (Hummel / European sportswear). */
export const CLOTHING_ADULT_SIZES = [
  "xxs",
  "xs",
  "s",
  "m",
  "l",
  "xl",
  "xxl",
  "3xl",
  "4xl",
  "5xl",
] as const;

/** Youth height sizes in cm (Hummel kids). */
export const CLOTHING_YOUTH_SIZES = [
  "104",
  "110",
  "116",
  "122",
  "128",
  "134",
  "140",
  "146",
  "152",
  "164",
  "176",
] as const;

export const CLOTHING_OTHER_SIZES = ["one_size"] as const;

export const CLOTHING_SIZES = [
  ...CLOTHING_ADULT_SIZES,
  ...CLOTHING_YOUTH_SIZES,
  ...CLOTHING_OTHER_SIZES,
] as const;

export type ClothingSize = (typeof CLOTHING_SIZES)[number];

export const CLOTHING_SIZE_LABELS: Record<ClothingSize, string> = {
  xxs: "XXS",
  xs: "XS",
  s: "S",
  m: "M",
  l: "L",
  xl: "XL",
  xxl: "XXL",
  "3xl": "3XL",
  "4xl": "4XL",
  "5xl": "5XL",
  "104": "104",
  "110": "110",
  "116": "116",
  "122": "122",
  "128": "128",
  "134": "134",
  "140": "140",
  "146": "146",
  "152": "152",
  "164": "164",
  "176": "176",
  one_size: "Única",
};

export const CLOTHING_SIZE_GROUPS = [
  { id: "adult", label: "Adulto", sizes: CLOTHING_ADULT_SIZES },
  { id: "youth", label: "Infantil (cm)", sizes: CLOTHING_YOUTH_SIZES },
  { id: "other", label: "Otros", sizes: CLOTHING_OTHER_SIZES },
] as const;
