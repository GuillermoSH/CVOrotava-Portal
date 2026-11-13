import { CheckCircle2, ChevronDown, Circle } from "lucide-react";
import Link from "next/link";

import { ORDER_STATUS_LABELS } from "@/lib/clothing/constants";
import { competitionNeedsJersey } from "@/lib/clothing/formatJersey";
import type { OrderNextStep } from "@/lib/clothing/orderNextStep";
import { summarizeOrderReceiving } from "@/lib/clothing/orderReceiving";
import type {
  ClothingInventoryLotWithDetails,
  ClothingOrderLineWithProduct,
  ClothingOrderStatus,
  ClothingPlannedDelivery,
  ClothingSupplierOrderStatusEvent,
} from "@/lib/types/db";
import { cn } from "@/lib/utils";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Qué hay que hacer ahora: el hallazgo de hoy, los pasos de la fase y dónde se hace cada uno. */
export function OrderNextStepCard({ nextStep }: { nextStep: OrderNextStep }) {
  const { title, body, finding, steps } = nextStep;
  return (
    <section className="ord-next ord-panel" aria-label="Siguiente paso">
      <h2 className="ord-next__title">{title}</h2>
      <p
        className={cn(
          "ord-next__finding",
          finding.tone === "warn" && "ord-next__finding--warn",
          finding.tone === "ok" && "ord-next__finding--ok",
        )}
      >
        {finding.text}
      </p>
      <p className="ord-next__body">{body}</p>

      {steps.length > 0 ? (
        <ul className="ord-steps" aria-label="Pasos de esta fase">
          {steps.map((step) => (
            <li key={step.label} className={cn("ord-step", step.done && "ord-step--done")}>
              {step.done ? (
                <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="ord-step__label">
                {step.label}
                {step.optional ? " (opcional)" : ""}
                <span className="sr-only">{step.done ? ": hecho" : ": pendiente"}</span>
              </span>
              {!step.done && step.href ? (
                step.href.startsWith("#") ? (
                  <a href={step.href} className="ord-step__go">
                    {step.go ?? "Ir"}
                  </a>
                ) : (
                  <Link href={step.href} className="ord-step__go">
                    {step.go ?? "Ir"}
                  </Link>
                )
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function Fact({
  label,
  value,
  tone,
  block = false,
}: {
  label: string;
  value: string;
  tone?: "warn" | "ok";
  block?: boolean;
}) {
  return (
    <div
      className={cn(
        "ord-fact",
        tone === "warn" && "ord-fact--warn",
        tone === "ok" && "ord-fact--ok",
        block && "ord-fact--block",
      )}
    >
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/** Los datos del pedido en filas, y su historial de estados plegado. */
export function OrderDetailsPanel({
  status,
  updatedAt,
  notes,
  events,
  lines,
  planned,
  lots,
}: {
  status: ClothingOrderStatus;
  updatedAt: string;
  notes?: string | null;
  events: ClothingSupplierOrderStatusEvent[];
  lines: ClothingOrderLineWithProduct[];
  planned: ClothingPlannedDelivery[];
  lots: ClothingInventoryLotWithDetails[];
}) {
  const receiving = summarizeOrderReceiving(lines);
  const plannedPending = planned.filter((row) => row.delivered_at === null).length;
  const plannedDelivered = planned.length - plannedPending;
  const pendingLots = lots.filter((lot) => lot.status === "pending_storage").length;
  const missingJersey = lots.filter((lot) =>
    competitionNeedsJersey(lot.product, lot.jersey_number),
  ).length;
  const hasStock = status === "returned_from_serigraphy" || status === "closed";
  const history = [...events].sort((a, b) => a.changed_at.localeCompare(b.changed_at));

  return (
    <section className="ord-details ord-panel" aria-label="Datos del pedido">
      <h2 className="ord-details__title">Datos del pedido</h2>
      <dl className="ord-facts">
        <Fact
          label="Pedidas"
          value={`${receiving.orderedUnits} uds · ${lines.length} ${lines.length === 1 ? "línea" : "líneas"}`}
        />
        {status !== "draft" ? (
          <Fact
            label="Recibidas"
            value={`${receiving.receivedUnits} de ${receiving.orderedUnits}`}
            tone={receiving.allComplete ? "ok" : undefined}
          />
        ) : null}
        {planned.length > 0 ? (
          <Fact
            label="Entregas previstas"
            value={
              plannedDelivered > 0
                ? `${plannedPending} pendientes · ${plannedDelivered} entregadas`
                : `${plannedPending} asignadas`
            }
          />
        ) : null}
        {hasStock ? (
          <Fact
            label="Almacén"
            value={pendingLots > 0 ? `${pendingLots} por ubicar` : "Todo ubicado"}
            tone={pendingLots > 0 ? "warn" : "ok"}
          />
        ) : null}
        {hasStock && missingJersey > 0 ? (
          <Fact label="Dorsales" value={`${missingJersey} por numerar`} tone="warn" />
        ) : null}
        <Fact label="Actualizado" value={formatDateTime(updatedAt)} />
        {status !== "draft" && notes ? <Fact label="Notas" value={notes} block /> : null}
      </dl>

      {history.length > 0 ? (
        <details className="ord-history">
          <summary>
            Historial de estados
            <ChevronDown className="ord-history__chev size-4" aria-hidden />
          </summary>
          <ol className="ord-history__list">
            {history.map((event) => (
              <li key={`${event.status}-${event.changed_at}`} className="ord-history__item">
                <span>{ORDER_STATUS_LABELS[event.status]}</span>
                <time dateTime={event.changed_at}>{formatDateTime(event.changed_at)}</time>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}
