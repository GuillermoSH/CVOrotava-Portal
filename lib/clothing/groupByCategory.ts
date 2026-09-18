import { CLOTHING_CATEGORIES, PRODUCT_CATEGORY_LABELS } from "@/lib/clothing/constants";
import type { ClothingProductCategory } from "@/lib/types/db";

export type ProductCategoryGroup<T> = {
  category: string;
  label: string;
  items: T[];
};

export function groupByProductCategory<T>(
  items: T[],
  categoryOf: (item: T) => ClothingProductCategory | string | undefined,
): ProductCategoryGroup<T>[] {
  const buckets = new Map<string, T[]>();

  for (const item of items) {
    const category = categoryOf(item) || "__other";
    const list = buckets.get(category) ?? [];
    list.push(item);
    buckets.set(category, list);
  }

  const groups: ProductCategoryGroup<T>[] = [];
  for (const category of CLOTHING_CATEGORIES) {
    const groupItems = buckets.get(category);
    if (!groupItems?.length) continue;
    groups.push({
      category,
      label: PRODUCT_CATEGORY_LABELS[category],
      items: groupItems,
    });
    buckets.delete(category);
  }

  for (const [category, groupItems] of buckets) {
    if (!groupItems.length) continue;
    groups.push({
      category,
      label:
        category === "__other"
          ? "Otros"
          : (PRODUCT_CATEGORY_LABELS[category as ClothingProductCategory] ?? category),
      items: groupItems,
    });
  }

  return groups;
}
