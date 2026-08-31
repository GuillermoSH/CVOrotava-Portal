"use client";

import { ORDER_STATUS_LABELS, ORDER_STATUSES } from "@/lib/clothing/constants";
import type { ClothingOrderStatus } from "@/lib/types/db";
import { cn } from "@/lib/utils";

export function OrderStatusStepper({ currentStatus }: { currentStatus: ClothingOrderStatus }) {
  const currentIndex = ORDER_STATUSES.indexOf(currentStatus);

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
                title={ORDER_STATUS_LABELS[status]}
              >
                <span className="line-clamp-2">{ORDER_STATUS_LABELS[status]}</span>
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
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
