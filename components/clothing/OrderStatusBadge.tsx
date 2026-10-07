import type { ClothingOrderStatus } from "@/lib/types/db";
import { ORDER_STATUS_LABELS } from "@/lib/clothing/constants";
import { cn } from "@/lib/utils";

const toneMap: Record<ClothingOrderStatus, string> = {
  draft: "ropa-status--idle",
  ordered: "ropa-status--live",
  received: "ropa-status--live",
  at_serigraphy: "ropa-status--warn",
  returned_from_serigraphy: "ropa-status--warn",
  closed: "ropa-status--ok",
};

export function OrderStatusBadge({ status }: { status: ClothingOrderStatus }) {
  return (
    <span className={cn("ropa-status", toneMap[status])}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
