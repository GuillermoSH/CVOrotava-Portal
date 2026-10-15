"use client";

import { ORDER_STATUS_LABELS, ORDER_STATUSES } from "@/lib/clothing/constants";
import type {
  ClothingOrderStatus,
  ClothingSupplierOrderStatusEvent,
} from "@/lib/types/db";
import { cn } from "@/lib/utils";

function formatStatusDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

function latestDateByStatus(
  events: ClothingSupplierOrderStatusEvent[],
): Partial<Record<ClothingOrderStatus, string>> {
  const map: Partial<Record<ClothingOrderStatus, string>> = {};
  for (const event of events) {
    const prev = map[event.status];
    if (!prev || event.changed_at > prev) {
      map[event.status] = event.changed_at;
    }
  }
  return map;
}

export function OrderStatusStepper({
  currentStatus,
  statusEvents = [],
}: {
  currentStatus: ClothingOrderStatus;
  statusEvents?: ClothingSupplierOrderStatusEvent[];
}) {
  const currentIndex = ORDER_STATUSES.indexOf(currentStatus);
  const dates = latestDateByStatus(statusEvents);

  return (
    <nav aria-label="Progreso del pedido" className="ropa-sets">
      <ol className="ropa-sets__track">
        {ORDER_STATUSES.map((status, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const date = dates[status];
          const label = ORDER_STATUS_LABELS[status];

          return (
            <li
              key={status}
              className={cn(
                "ropa-sets__set",
                index === 0 && "ropa-sets__set--first",
                index === ORDER_STATUSES.length - 1 && "ropa-sets__set--last",
                isPast && "ropa-sets__set--past",
                isCurrent && "ropa-sets__set--current",
              )}
              aria-current={isCurrent ? "step" : undefined}
              title={
                date
                  ? `${label} · ${formatStatusDate(date)}`
                  : label
              }
            >
              <span className="ropa-sets__name">{label}</span>
              {date && (isPast || isCurrent) ? (
                <time dateTime={date} className="ropa-sets__date">
                  {formatStatusDate(date)}
                </time>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
