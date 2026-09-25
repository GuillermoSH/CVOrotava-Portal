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
      {/* Desktop: compact horizontal progress — equal columns, no overflow */}
      <nav aria-label="Progreso del pedido" className="hidden overflow-hidden md:block">
        <div className="relative flex items-center">
          {ORDER_STATUSES.map((status, index) => {
            const isPast = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={status} className="relative flex min-w-0 flex-1 items-center">
                {index > 0 ? (
                  <div
                    className={cn(
                      "absolute right-1/2 left-0 top-1/2 h-0.5 -translate-y-1/2",
                      isPast || isCurrent ? "bg-[var(--club-brand)]" : "bg-[var(--club-border)]",
                    )}
                    aria-hidden
                  />
                ) : null}
                {index < ORDER_STATUSES.length - 1 ? (
                  <div
                    className={cn(
                      "absolute left-1/2 right-0 top-1/2 h-0.5 -translate-y-1/2",
                      isPast ? "bg-[var(--club-brand)]" : "bg-[var(--club-border)]",
                    )}
                    aria-hidden
                  />
                ) : null}
                <div className="relative z-10 mx-auto flex size-5 shrink-0 items-center justify-center">
                  <div
                    className={cn(
                      "rounded-full border-2 transition-colors",
                      isCurrent
                        ? "size-3.5 border-[var(--club-brand)] bg-[var(--club-brand)]"
                        : isPast
                          ? "size-2.5 border-[var(--club-brand)] bg-[var(--club-brand)]"
                          : "size-2.5 border-[var(--club-border)] bg-[var(--club-surface)]",
                    )}
                    aria-hidden
                  />
                </div>
              </div>
            );
          })}
        </div>
        <ol className="mt-2 grid grid-cols-6 gap-0.5">
          {ORDER_STATUSES.map((status, index) => {
            const isPast = index < currentIndex;
            const isCurrent = index === currentIndex;
            const date = dates[status];

            return (
              <li
                key={status}
                className={cn(
                  "min-w-0 px-0.5 text-center text-[0.625rem] leading-tight lg:text-xs",
                  isCurrent
                    ? "font-semibold text-foreground"
                    : isPast
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
                title={
                  date
                    ? `${ORDER_STATUS_LABELS[status]} · ${formatStatusDate(date)}`
                    : ORDER_STATUS_LABELS[status]
                }
              >
                <span className="line-clamp-2">{ORDER_STATUS_LABELS[status]}</span>
                {date && (isPast || isCurrent) ? (
                  <span className="mt-0.5 block tabular-nums text-muted-foreground">
                    {formatStatusDate(date)}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Mobile: vertical timeline — scannable without horizontal scroll */}
      <nav aria-label="Progreso del pedido" className="md:hidden">
        <ol className="flex flex-col">
          {ORDER_STATUSES.map((status, index) => {
            const isPast = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isLast = index === ORDER_STATUSES.length - 1;
            const date = dates[status];

            return (
              <li key={status} className="flex gap-3">
                <div className="flex w-5 shrink-0 flex-col items-center">
                  <div
                    className={cn(
                      "mt-1.5 rounded-full",
                      isCurrent
                        ? "size-3 border-2 border-[var(--club-brand)] bg-[var(--club-brand)]"
                        : isPast
                          ? "size-2.5 bg-[var(--club-brand)]"
                          : "size-2.5 border border-[var(--club-border)] bg-[var(--club-surface)]",
                    )}
                    aria-hidden
                  />
                  {!isLast ? (
                    <div
                      className={cn(
                        "my-1 w-px flex-1 min-h-3",
                        isPast ? "bg-[var(--club-brand)]" : "bg-[var(--club-border)]",
                      )}
                      aria-hidden
                    />
                  ) : null}
                </div>
                <div className={cn("min-w-0 flex-1", !isLast && "pb-3")}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        "text-sm leading-snug",
                        isCurrent
                          ? "font-semibold text-foreground"
                          : isPast
                            ? "text-foreground"
                            : "text-muted-foreground",
                      )}
                    >
                      {ORDER_STATUS_LABELS[status]}
                    </span>
                    {date && (isPast || isCurrent) ? (
                      <time
                        dateTime={date}
                        className="shrink-0 text-xs tabular-nums text-muted-foreground"
                      >
                        {formatStatusDate(date)}
                      </time>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
