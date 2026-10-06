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
    <>
      <nav aria-label="Progreso del pedido" className="ropa-sets hidden md:block">
        <ol className="ropa-sets__track">
          {ORDER_STATUSES.map((status, index) => {
            const isPast = index < currentIndex;
            const isCurrent = index === currentIndex;
            const date = dates[status];

            return (
              <li
                key={status}
                className={cn(
                  "ropa-sets__set",
                  isPast && "ropa-sets__set--past",
                  isCurrent && "ropa-sets__set--current",
                )}
                title={
                  date
                    ? `${ORDER_STATUS_LABELS[status]} · ${formatStatusDate(date)}`
                    : ORDER_STATUS_LABELS[status]
                }
              >
                <span className="ropa-sets__num ropa-digit">{index + 1}</span>
                <span className="ropa-sets__name">{ORDER_STATUS_LABELS[status]}</span>
                {date && (isPast || isCurrent) ? (
                  <span className="ropa-sets__date">{formatStatusDate(date)}</span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </nav>

      <nav aria-label="Progreso del pedido" className="ropa-sets-mobile md:hidden">
        <ol className="ropa-sets-mobile__list">
          {ORDER_STATUSES.map((status, index) => {
            const isPast = index < currentIndex;
            const isCurrent = index === currentIndex;
            const date = dates[status];

            return (
              <li
                key={status}
                className={cn(
                  "ropa-sets-mobile__item",
                  isPast && "ropa-sets-mobile__item--past",
                  isCurrent && "ropa-sets-mobile__item--current",
                )}
              >
                <span className="ropa-sets-mobile__num ropa-digit">{index + 1}</span>
                <span className="ropa-sets-mobile__name">{ORDER_STATUS_LABELS[status]}</span>
                {date && (isPast || isCurrent) ? (
                  <time dateTime={date} className="ropa-sets-mobile__date">
                    {formatStatusDate(date)}
                  </time>
                ) : null}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
