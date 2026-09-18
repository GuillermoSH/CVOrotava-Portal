import { PRODUCT_CATEGORY_LABELS } from "@/lib/clothing/constants";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import type { ClothingInventoryLot, ClothingProduct } from "@/lib/types/db";

export function formatJerseyNumber(n: number): string {
  return `#${n}`;
}

export function competitionNeedsJersey(
  product: Pick<ClothingProduct, "category">,
  jerseyNumber: number | null,
): boolean {
  return product.category === "shirt_competition" && jerseyNumber == null;
}

const JERSEY_TOKEN = /^#?(\d{1,2})$/;

export function parseJerseySearch(query: string): number | null {
  const match = query.trim().match(JERSEY_TOKEN);
  if (!match) return null;
  const n = Number.parseInt(match[1]!, 10);
  if (!Number.isFinite(n) || n < 0 || n > 99) return null;
  return n;
}

export function parseJerseyNumberList(text: string): number[] {
  const tokens = text.split(/[\s,;]+/).map((token) => token.trim()).filter(Boolean);
  const numbers: number[] = [];
  for (const token of tokens) {
    const parsed = parseJerseySearch(token);
    if (parsed === null) {
      throw new Error(`Dorsal no válido: ${token}`);
    }
    numbers.push(parsed);
  }
  return numbers;
}

export function lotMatchesQuery(
  lot: ClothingInventoryLot & { product: ClothingProduct },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const jersey = parseJerseySearch(q);
  if (jersey !== null && lot.jersey_number === jersey) return true;

  const haystack = [
    formatProductShort(lot.product),
    lot.product.model,
    PRODUCT_CATEGORY_LABELS[lot.product.category],
    lot.product.category,
    formatClothingSize(lot.size),
    lot.jersey_number != null ? formatJerseyNumber(lot.jersey_number) : "",
    lot.jersey_number != null ? String(lot.jersey_number) : "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}
