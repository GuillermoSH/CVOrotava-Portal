"use client";

import Link from "next/link";

import { ClothingSetBand } from "@/components/clothing/ClothingSetBand";
import { OrderStatusActions } from "@/components/clothing/OrderStatusActions";
import { ORDER_STATUS_LABELS } from "@/lib/clothing/constants";
import { summarizeOrderReceiving } from "@/lib/clothing/orderReceiving";
import { competitionNeedsJersey } from "@/lib/clothing/formatJersey";
import { appRoutes } from "@/lib/constants";
import type {
  ClothingInventoryLotWithDetails,
  ClothingOrderLineWithProduct,
  ClothingOrderStatus,
} from "@/lib/types/db";
import { cn } from "@/lib/utils";

function nowGuidance(status: ClothingOrderStatus): {
  title: string;
  body: string;
  anchorHref?: string;
  anchorLabel?: string;
} {
  switch (status) {
    case "draft":
      return {
        title: "Confirmar y enviar el pedido",
        body: "Revisa las líneas y marca el pedido como enviado al proveedor.",
      };
    case "ordered":
      return {
        title: "Verificar la recepción",
        body: "Contrasta las cajas con el panel: anota recibidas por talla y, cuando cuadre, marca como recibido.",
        anchorHref: "#verificacion-recepcion",
        anchorLabel: "Ir al panel de verificación",
      };
    case "received":
      return {
        title: "Enviar a serigrafía",
        body: "Si faltan unidades, puedes enviar igual tras confirmar. Lo no recibido no entrará al almacén después.",
        anchorHref: "#verificacion-recepcion",
        anchorLabel: "Revisar faltantes",
      };
    case "at_serigraphy":
      return {
        title: "Registrar la vuelta de serigrafía",
        body: "Al volver, se crearán lotes pendientes de ubicar en el almacén del club.",
      };
    case "returned_from_serigraphy":
      return {
        title: "Numerar dorsales y ubicar",
        body: "Primero numera las camisetas de competición que lo necesiten; luego ubica cada lote en una caja del club.",
      };
    case "closed":
      return {
        title: "Pedido cerrado",
        body: "No hay más pasos en este pedido.",
      };
  }
}

function ScoreCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn" | "ok" | "default";
}) {
  return (
    <div className="ropa-score-cell">
      <span className="ropa-score-cell__label">{label}</span>
      <span
        className={cn(
          "ropa-digit ropa-digit--md",
          tone === "warn" && "text-[var(--club-warning-strong)]",
          tone === "ok" && "text-success",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function OrderCockpit({
  orderId,
  status,
  lines,
  orderLots = [],
}: {
  orderId: string;
  status: ClothingOrderStatus;
  lines: ClothingOrderLineWithProduct[];
  orderLots?: ClothingInventoryLotWithDetails[];
}) {
  const receiving = summarizeOrderReceiving(lines);
  const guidance = nowGuidance(status);
  const showReceivingStats =
    status === "ordered" ||
    status === "received" ||
    status === "at_serigraphy" ||
    status === "returned_from_serigraphy" ||
    status === "closed";

  const pendingLots = orderLots.filter((lot) => lot.status === "pending_storage");
  const missingJerseyLots = orderLots.filter((lot) =>
    competitionNeedsJersey(lot.product, lot.jersey_number),
  );
  const showPostSerigraphy =
    status === "returned_from_serigraphy" ||
    (status === "closed" && pendingLots.length > 0);

  const warehouseHref = `${appRoutes.clothing.warehouse}?order=${orderId}&status=pending_storage`;
  const jerseyHref = `${appRoutes.clothing.warehouse}?order=${orderId}&missingJersey=1`;

  return (
    <div className="flex flex-col gap-3">
      {showReceivingStats ? (
        <div className="ropa-score-strip" aria-label="Marcador de recepción">
          <ScoreCell label="Pedidas" value={String(receiving.orderedUnits)} />
          <ScoreCell label="Recibidas" value={String(receiving.receivedUnits)} />
          <ScoreCell
            label="Faltantes"
            value={String(receiving.missingUnits)}
            tone={receiving.missingUnits > 0 ? "warn" : "ok"}
          />
          <ScoreCell
            label="Tallas OK"
            value={`${receiving.completeLines}/${receiving.totalLines}`}
          />
        </div>
      ) : null}

      <ClothingSetBand
        lit={status !== "closed"}
        title={guidance.title}
        body={guidance.body}
        href={guidance.anchorHref}
        hrefLabel={guidance.anchorLabel}
      />

      {showPostSerigraphy ? (
        <div className="ropa-panel__block flex flex-col gap-2 !border-0 !p-0">
          {missingJerseyLots.length > 0 ? (
            <Link href={jerseyHref} className="btn-secondary min-h-11 w-fit md:min-h-8">
              Numerar dorsales ({missingJerseyLots.length})
            </Link>
          ) : null}
          {pendingLots.length > 0 ? (
            <Link href={warehouseHref} className="btn-primary min-h-11 w-fit md:min-h-8">
              Pendiente ubicar ({pendingLots.length} lote
              {pendingLots.length === 1 ? "" : "s"})
            </Link>
          ) : (
            <p className="text-sm text-success">No queda stock de este pedido por ubicar.</p>
          )}
          <Link
            href={`${appRoutes.clothing.warehouse}?order=${orderId}`}
            className="text-sm font-medium text-brand"
          >
            Ver todo el stock de este pedido
          </Link>
        </div>
      ) : null}

      {status !== "closed" ? (
        <div className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-[var(--ropa-line)] bg-[var(--ropa-panel)] p-3">
          <p className="text-xs text-muted-foreground">
            Estado: {ORDER_STATUS_LABELS[status]}
          </p>
          <OrderStatusActions
            orderId={orderId}
            status={status}
            missingUnits={receiving.missingUnits}
            missingSizes={receiving.incompleteLines}
          />
        </div>
      ) : null}
    </div>
  );
}
