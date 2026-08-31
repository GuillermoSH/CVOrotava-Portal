import { CLOTHING_SIZE_LABELS } from "@/lib/clothing/constants";
import type { ClothingSize } from "@/lib/types/db";

export function formatClothingSize(size: ClothingSize | string): string {
  if (size in CLOTHING_SIZE_LABELS) {
    return CLOTHING_SIZE_LABELS[size as ClothingSize];
  }
  return size;
}
