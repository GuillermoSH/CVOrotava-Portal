import { formatClothingSize } from "@/lib/clothing/formatSize";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import type {
  ClothingOrderLineWithProduct,
  ClothingOrderWithLines,
} from "@/lib/types/db";

/** Cantidad efectiva para resumen: recibida si > 0, si no pedida. */
export function orderLineDisplayQty(line: ClothingOrderLineWithProduct): number {
  return line.quantity_received > 0 ? line.quantity_received : line.quantity_ordered;
}

/** Texto corto: "Hummel · Modelo (Rojo) × M × 12". */
export function formatOrderLineSummary(line: ClothingOrderLineWithProduct): string {
  return `${formatProductShort(line.product)} × ${formatClothingSize(line.size)} × ${orderLineDisplayQty(line)}`;
}

export function orderMatchesQuery(order: ClothingOrderWithLines, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    order.reference,
    order.supplier_name,
    order.season,
    order.notes ?? "",
    ...order.lines.map((line) => formatOrderLineSummary(line)),
    ...order.lines.map((line) => line.product.model),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}
