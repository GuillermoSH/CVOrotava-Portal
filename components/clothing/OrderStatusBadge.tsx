import type { ClothingOrderStatus } from "@/lib/types/db";
import { Badge } from "@/components/club/Badge";
import { ORDER_STATUS_LABELS } from "@/lib/clothing/constants";

const variantMap: Record<
  ClothingOrderStatus,
  "secondary" | "info" | "warning" | "success" | "default"
> = {
  draft: "secondary",
  ordered: "info",
  received: "info",
  at_serigraphy: "warning",
  returned_from_serigraphy: "warning",
  closed: "success",
};

export function OrderStatusBadge({ status }: { status: ClothingOrderStatus }) {
  return <Badge variant={variantMap[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}
