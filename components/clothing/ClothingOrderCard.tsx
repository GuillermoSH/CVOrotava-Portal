import Link from "next/link";

import { OrderStatusBadge } from "@/components/clothing/OrderStatusBadge";
import { formatOrderLineSummary } from "@/lib/clothing/formatOrderLines";
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
    <Link href={appRoutes.clothing.orderDetail(order.id)} className="ropa-order-row">
      <div className="ropa-order-row__top">
        <p className="ropa-order-row__ref">{order.reference}</p>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="ropa-order-row__supplier">{order.supplier_name}</p>
      {order.lines.length > 0 ? (
        <p className="ropa-order-row__lines">
          {order.lines
            .slice(0, 3)
            .map((line) => formatOrderLineSummary(line))
            .join(" · ")}
          {order.lines.length > 3 ? ` · +${order.lines.length - 3}` : ""}
        </p>
      ) : null}
      <time className="ropa-order-row__date" dateTime={order.updated_at}>
        {formatOrderDate(order.updated_at)}
      </time>
    </Link>
  );
}
