import {
  CLOTHING_BRAND_LABELS,
  CLOTHING_COLOR_LABELS,
  PRODUCT_CATEGORY_LABELS,
} from "@/lib/clothing/constants";
import type {
  ClothingProduct,
  ClothingProductBrand,
  ClothingProductCategory,
  ClothingProductColor,
} from "@/lib/types/db";

export function formatProductLabel(
  product: Pick<ClothingProduct, "model" | "brand" | "color" | "category">,
): string {
  return `${CLOTHING_BRAND_LABELS[product.brand]} · ${product.model} · ${CLOTHING_COLOR_LABELS[product.color]} · ${PRODUCT_CATEGORY_LABELS[product.category]}`;
}

export function formatProductShort(
  product: Pick<ClothingProduct, "model" | "brand" | "color">,
): string {
  return `${CLOTHING_BRAND_LABELS[product.brand]} · ${product.model} (${CLOTHING_COLOR_LABELS[product.color]})`;
}

export function formatProductCategoryColor(
  category: ClothingProductCategory,
  color: ClothingProductColor,
): string {
  return `${PRODUCT_CATEGORY_LABELS[category]} · ${CLOTHING_COLOR_LABELS[color]}`;
}

export function formatProductBrand(brand: ClothingProductBrand): string {
  return CLOTHING_BRAND_LABELS[brand];
}
