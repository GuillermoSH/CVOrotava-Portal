import { CLOTHING_SIZES } from "@/lib/clothing/constants";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import type { ClothingOrderLineWithProduct } from "@/lib/types/db";

export type LineReceivingState = "complete" | "short" | "excess" | "empty";

export type ReceivingLineView = {
  line: ClothingOrderLineWithProduct;
  state: LineReceivingState;
  missing: number;
  excess: number;
};

export type ReceivingProductGroup = {
  productId: string;
  productLabel: string;
  lines: ReceivingLineView[];
  orderedUnits: number;
  receivedUnits: number;
  missingUnits: number;
  excessUnits: number;
  completeSizes: number;
  totalSizes: number;
  allComplete: boolean;
};

export type OrderReceivingSummary = {
  orderedUnits: number;
  receivedUnits: number;
  missingUnits: number;
  excessUnits: number;
  incompleteLines: number;
  excessLines: number;
  completeLines: number;
  totalLines: number;
  allComplete: boolean;
  groups: ReceivingProductGroup[];
};

function sizeRank(size: string): number {
  const idx = CLOTHING_SIZES.indexOf(size as (typeof CLOTHING_SIZES)[number]);
  return idx === -1 ? 999 : idx;
}

export function lineReceivingState(
  ordered: number,
  received: number,
): LineReceivingState {
  if (received <= 0) return "empty";
  if (received > ordered) return "excess";
  if (received < ordered) return "short";
  return "complete";
}

export function summarizeOrderReceiving(
  lines: ClothingOrderLineWithProduct[],
): OrderReceivingSummary {
  const byProduct = new Map<string, ClothingOrderLineWithProduct[]>();

  for (const line of lines) {
    const list = byProduct.get(line.product_id) ?? [];
    list.push(line);
    byProduct.set(line.product_id, list);
  }

  const groups: ReceivingProductGroup[] = [];

  for (const [productId, productLines] of byProduct) {
    const sorted = [...productLines].sort(
      (a, b) => sizeRank(a.size) - sizeRank(b.size),
    );
    const views: ReceivingLineView[] = sorted.map((line) => {
      const missing = Math.max(0, line.quantity_ordered - line.quantity_received);
      const excess = Math.max(0, line.quantity_received - line.quantity_ordered);
      return {
        line,
        state: lineReceivingState(line.quantity_ordered, line.quantity_received),
        missing,
        excess,
      };
    });

    const orderedUnits = views.reduce((s, v) => s + v.line.quantity_ordered, 0);
    const receivedUnits = views.reduce((s, v) => s + v.line.quantity_received, 0);
    const missingUnits = views.reduce((s, v) => s + v.missing, 0);
    const excessUnits = views.reduce((s, v) => s + v.excess, 0);
    const completeSizes = views.filter((v) => v.state === "complete").length;
    const label = formatProductShort(sorted[0]!.product);

    groups.push({
      productId,
      productLabel: label,
      lines: views,
      orderedUnits,
      receivedUnits,
      missingUnits,
      excessUnits,
      completeSizes,
      totalSizes: views.length,
      allComplete: completeSizes === views.length && excessUnits === 0,
    });
  }

  groups.sort((a, b) => a.productLabel.localeCompare(b.productLabel, "es"));

  const orderedUnits = groups.reduce((s, g) => s + g.orderedUnits, 0);
  const receivedUnits = groups.reduce((s, g) => s + g.receivedUnits, 0);
  const missingUnits = groups.reduce((s, g) => s + g.missingUnits, 0);
  const excessUnits = groups.reduce((s, g) => s + g.excessUnits, 0);
  const incompleteLines = groups.reduce(
    (s, g) => s + g.lines.filter((v) => v.missing > 0).length,
    0,
  );
  const excessLines = groups.reduce(
    (s, g) => s + g.lines.filter((v) => v.excess > 0).length,
    0,
  );
  const completeLines = groups.reduce(
    (s, g) => s + g.lines.filter((v) => v.state === "complete").length,
    0,
  );

  return {
    orderedUnits,
    receivedUnits,
    missingUnits,
    excessUnits,
    incompleteLines,
    excessLines,
    completeLines,
    totalLines: lines.length,
    allComplete: incompleteLines === 0 && excessLines === 0 && lines.length > 0,
    groups,
  };
}
