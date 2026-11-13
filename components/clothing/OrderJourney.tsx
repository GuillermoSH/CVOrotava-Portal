import { Check } from "lucide-react";

import { ORDER_STATUS_LABELS, ORDER_STATUSES } from "@/lib/clothing/constants";
import type { ClothingOrderStatus, ClothingSupplierOrderStatusEvent } from "@/lib/types/db";
import { cn } from "@/lib/utils";

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

/** Última fecha en que el pedido entró en cada estado. */
function latestDates(events: readonly ClothingSupplierOrderStatusEvent[]) {
  const map = new Map<ClothingOrderStatus, string>();
  for (const event of events) {
    const prev = map.get(event.status);
    if (!prev || event.changed_at > prev) map.set(event.status, event.changed_at);
  }
  return map;
}

/**
 * Seguimiento del pedido, como el de un envío: una línea con sus seis estados y la fecha de cada
 * uno ya alcanzado. En móvil se reduce a «Paso 2 de 6» con una barra segmentada.
 */
export function OrderJourney({
  status,
  events,
}: {
  status: ClothingOrderStatus;
  events: readonly ClothingSupplierOrderStatusEvent[];
}) {
  const index = ORDER_STATUSES.indexOf(status);
  const dates = latestDates(events);
  const next = ORDER_STATUSES[index + 1];

  return (
    <nav className="ord-journey" aria-label="Seguimiento del pedido">
      <div className="ord-journey__compact">
        <ol className="ord-progress" aria-hidden>
          {ORDER_STATUSES.map((s, i) => (
            <li
              key={s}
              className={cn(
                "ord-progress__seg",
                i < index && "ord-progress__seg--past",
                i === index && "ord-progress__seg--current",
              )}
            />
          ))}
        </ol>
        <p className="ord-progress-caption">
          <span>
            Paso <strong>{index + 1}</strong> de {ORDER_STATUSES.length} ·{" "}
            <strong>{ORDER_STATUS_LABELS[status]}</strong>
          </span>
          {next ? <span>Sigue: {ORDER_STATUS_LABELS[next]}</span> : null}
        </p>
      </div>

      <ol className="ord-journey__track">
        {ORDER_STATUSES.map((s, i) => {
          const date = dates.get(s);
          return (
            <li
              key={s}
              className={cn("ord-j", i < index && "ord-j--done", i === index && "ord-j--now")}
              aria-current={i === index ? "step" : undefined}
            >
              <span className="ord-j__dot">
                {i < index ? <Check className="size-3" strokeWidth={3} aria-hidden /> : null}
              </span>
              <span className="ord-j__label">{ORDER_STATUS_LABELS[s]}</span>
              <span className="ord-j__date">
                {date && i <= index ? <time dateTime={date}>{shortDate(date)}</time> : " "}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
