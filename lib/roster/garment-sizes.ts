import { CLOTHING_CATEGORIES, type ClothingCategory } from "@/lib/clothing/constants";
import type { ClothingSize } from "@/lib/types/db";

/** Prendas con talla propia en la tarjeta del jugador (todas las del catálogo menos la mochila). */
export const GARMENT_CATEGORIES = CLOTHING_CATEGORIES.filter(
  (category): category is Exclude<ClothingCategory, "backpack"> => category !== "backpack",
);

export type GarmentCategory = (typeof GARMENT_CATEGORIES)[number];

/** Talla de cada prenda; una prenda sin talla simplemente no aparece. */
export type PlayerGarmentSizes = Partial<Record<GarmentCategory, ClothingSize>>;

export function isGarmentCategory(value: string): value is GarmentCategory {
  return (GARMENT_CATEGORIES as readonly string[]).includes(value);
}

/** Dorsal válido: entero de 0 a 99. */
export function parseJerseyNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d{1,2}$/.test(trimmed)) return null;
  return Number(trimmed);
}
