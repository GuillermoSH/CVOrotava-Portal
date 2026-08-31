import Link from "next/link";

import { Badge } from "@/components/club/Badge";
import { OrderStatusBadge } from "@/components/clothing/OrderStatusBadge";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { appRoutes } from "@/lib/constants";
import type { ClothingOrderWithLines } from "@/lib/types/db";

function formatOrderDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ClothingOrderCard({ order }: { order: ClothingOrderWithLines }) {
  return (
    <Link href={appRoutes.clothing.orderDetail(order.id)} className="clothing-list-card block">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate font-semibold tracking-tight text-foreground">
          {order.reference}
        </p>
        <OrderStatusBadge status={order.status} />
      </div>

      <p className="mt-1 truncate text-sm text-muted-foreground">{order.supplier_name}</p>

      {order.lines.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {order.lines.slice(0, 3).map((line) => (
            <Badge key={line.id} variant="secondary" className="text-[11px]">
              {line.product.name} {formatClothingSize(line.size)}
            </Badge>
          ))}
          {order.lines.length > 3 ? (
            <Badge variant="secondary" className="text-[11px]">
              +{order.lines.length - 3}
            </Badge>
          ) : null}
        </div>
      ) : null}

      <p className="mt-3 text-xs text-muted-foreground">
        <span className="text-muted-foreground/80">Actualizado </span>
        <time className="tabular-nums" dateTime={order.updated_at}>
          {formatOrderDate(order.updated_at)}
        </time>
      </p>
    </Link>
  );
}
