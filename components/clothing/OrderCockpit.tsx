"use client";

import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";

import { ClothingSetBand } from "@/components/clothing/ClothingSetBand";
import { OrderStatusActions } from "@/components/clothing/OrderStatusActions";
import { summarizeOrderReceiving } from "@/lib/clothing/orderReceiving";
import { stockRollbackBlocker } from "@/lib/clothing/orderRollback";
import { competitionNeedsJersey } from "@/lib/clothing/formatJersey";
import { appRoutes } from "@/lib/constants";
import type {
  ClothingInventoryLotWithDetails,
  ClothingOrderLineWithProduct,
  ClothingOrderStatus,
} from "@/lib/types/db";
import { cn } from "@/lib/utils";

type ChecklistItem = { label: string; done: boolean; optional?: boolean; href?: string };

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
        body: "Edita el contenido abajo si hace falta; al marcarlo como enviado, las líneas quedarán bloqueadas.",
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
  plannedCount = 0,
}: {
  orderId: string;
  status: ClothingOrderStatus;
  lines: ClothingOrderLineWithProduct[];
  orderLots?: ClothingInventoryLotWithDetails[];
  /** Entregas previstas asignadas en el pedido (pendientes y entregadas). */
  plannedCount?: number;
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

  const stockBlocker =
    status === "returned_from_serigraphy" || status === "closed"
      ? stockRollbackBlocker(orderLots, lines)
      : null;

  const checklist: ChecklistItem[] = [];
  if (status === "draft") {
    checklist.push({ label: "Añadir las líneas del pedido", done: lines.length > 0 });
    checklist.push({
      label:
        plannedCount > 0
          ? `Entregas previstas: ${plannedCount} asignadas`
          : "Asignar prendas a jugadores",
      done: plannedCount > 0,
      optional: true,
      href: "#entregas-previstas",
    });
  } else if (status === "ordered") {
    checklist.push({
      label: "Anotar las unidades recibidas",
      done: receiving.receivedUnits > 0,
      href: "#verificacion-recepcion",
    });
    checklist.push({
      label: "Que lo recibido cuadre con lo pedido",
      done: receiving.allComplete,
    });
  } else if (status === "received") {
    checklist.push({ label: "Sin unidades por llegar", done: receiving.missingUnits === 0 });
  } else if (status === "returned_from_serigraphy") {
    if (orderLots.length === 0 || missingJerseyLots.length > 0) {
      checklist.push({
        label: "Numerar los dorsales de competición",
        done: missingJerseyLots.length === 0,
      });
    }
    checklist.push({
      label: "Ubicar cada lote en el almacén",
      done: pendingLots.length === 0,
    });
  }

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

      {checklist.length > 0 ? (
        <ul className="flex flex-col gap-1.5" aria-label="Pasos de esta fase">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-sm">
              {item.done ? (
                <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className={item.done ? "text-muted-foreground" : "text-foreground"}>
                {item.label}
                {item.optional ? " (opcional)" : ""}
              </span>
              {item.href ? (
                <a href={item.href} className="ml-auto text-xs font-medium text-brand">
                  Ir
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="ropa-order-actions">
        <OrderStatusActions
          orderId={orderId}
          status={status}
          missingUnits={receiving.missingUnits}
          missingSizes={receiving.incompleteLines}
          stockBlocker={stockBlocker}
        />
      </div>
    </div>
  );
}
