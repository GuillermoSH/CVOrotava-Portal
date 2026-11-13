"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/club/Button";
import { OrderLineReceivedEditor } from "@/components/clothing/OrderLineReceivedEditor";
import { updateOrderLineReceived } from "@/lib/actions/clothing/orders";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import {
  summarizeOrderReceiving,
  type LineReceivingState,
  type ReceivingProductGroup,
} from "@/lib/clothing/orderReceiving";
import { appToast } from "@/lib/toast";
import type { ClothingOrderLineWithProduct } from "@/lib/types/db";
import { cn } from "@/lib/utils";

type Filter = "all" | "short" | "done";

function stateLabel(state: LineReceivingState, missing: number, excess: number): string {
  if (state === "complete") return "Completo";
  if (state === "excess") return `Exceso +${excess}`;
  if (state === "short") return `Faltan ${missing}`;
  return "Sin recibir";
}

function chipStateClass(state: LineReceivingState): string {
  if (state === "complete") return "ropa-verify-chip--complete";
  if (state === "excess") return "ropa-verify-chip--excess";
  if (state === "short") return "ropa-verify-chip--short";
  return "ropa-verify-chip--empty";
}

function groupMeta(group: ReceivingProductGroup): string {
  const sizes = `${group.completeSizes}/${group.totalSizes} tallas`;
  if (group.missingUnits > 0) return `Faltan ${group.missingUnits} uds · ${sizes}`;
  if (group.excessUnits > 0) return `Exceso ${group.excessUnits} uds · ${sizes}`;
  return `${group.receivedUnits} uds · ${sizes}`;
}

/**
 * Líneas del pedido por prenda: una fila por prenda con sus tallas (recibidas / pedidas). Mientras
 * el pedido está enviado o recibido, las tallas se anotan aquí mismo.
 */
export function OrderLinesPanel({
  lines,
  editable,
}: {
  lines: ClothingOrderLineWithProduct[];
  editable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const summary = summarizeOrderReceiving(lines);

  const counts = useMemo(
    () => ({
      all: summary.groups.length,
      short: summary.groups.filter((g) => !g.allComplete).length,
      done: summary.groups.filter((g) => g.allComplete).length,
    }),
    [summary.groups],
  );
  const groups = summary.groups.filter((g) =>
    filter === "all" ? true : filter === "short" ? !g.allComplete : g.allComplete,
  );

  async function applyReceived(targets: ClothingOrderLineWithProduct[]) {
    const updates = targets.filter((line) => line.quantity_received !== line.quantity_ordered);
    if (updates.length === 0) {
      appToast.success("Ya estaba al día");
      return;
    }
    for (const line of updates) {
      const result = await updateOrderLineReceived({
        line_id: line.id,
        quantity_received: line.quantity_ordered,
      });
      if (!result.ok) {
        appToast.error(result.error);
        router.refresh();
        return;
      }
    }
    appToast.success(updates.length === 1 ? "Prenda marcada como completa" : "Pedido marcado como recibido");
    router.refresh();
  }

  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground">Este pedido no tiene líneas.</p>;
  }

  const received = summary.receivedUnits;
  const ordered = summary.orderedUnits;
  const pct = ordered > 0 ? Math.min(100, Math.round((received / ordered) * 100)) : 0;
  const showFilters = summary.groups.length > 4;

  return (
    <div className="ord-lines">
      <div className="ord-lines__bar">
        <div className="ord-lines__progress">
          <p className="ord-lines__figure">
            <strong className="ropa-digit">{received}</strong> de {ordered} uds recibidas
            {summary.missingUnits > 0 ? (
              <span className="ord-lines__missing"> · faltan {summary.missingUnits}</span>
            ) : (
              <span className="ord-lines__ok"> · recepción completa</span>
            )}
          </p>
          <div
            className={cn("ord-meter", summary.allComplete && "ord-meter--complete")}
            role="img"
            aria-label={`${received} de ${ordered} unidades recibidas`}
          >
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>
        {editable && !summary.allComplete ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            className="min-h-11 md:min-h-9"
            onClick={() => startTransition(() => applyReceived(lines))}
          >
            Marcar todo recibido
          </Button>
        ) : null}
      </div>

      {showFilters ? (
        <div className="ord-chips" role="group" aria-label="Filtrar prendas">
          {(
            [
              ["all", "Todas"],
              ["short", "Con faltantes"],
              ["done", "Completas"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="ord-chip"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label} <span className="ord-chip__count">{counts[key]}</span>
            </button>
          ))}
        </div>
      ) : null}

      {groups.length === 0 ? (
        <p className="ord-empty">
          {filter === "short" ? "No queda ninguna prenda con faltantes." : "Ninguna prenda completa todavía."}
        </p>
      ) : (
        <ul className="ord-rows">
          {groups.map((group) => (
            <li key={group.productId} className="ord-row">
              <div className="ord-row__name">
                <h3>{group.productLabel}</h3>
                <p className={cn(group.allComplete && "text-success")}>{groupMeta(group)}</p>
              </div>
              <ul className="ord-row__sizes" aria-label={`Tallas de ${group.productLabel}`}>
                {group.lines.map(({ line, state, missing, excess }) => {
                  const sizeLabel = formatClothingSize(line.size);
                  return (
                    <li
                      key={line.id}
                      className={cn("ropa-verify-chip", chipStateClass(state))}
                      title={`${sizeLabel}: ${stateLabel(state, missing, excess)}`}
                    >
                      <span className="ropa-verify-chip__size">{sizeLabel}</span>
                      {editable ? (
                        <OrderLineReceivedEditor line={line} layout="chip" />
                      ) : (
                        <span className="ropa-digit ropa-digit--sm">{line.quantity_received}</span>
                      )}
                      <span className="ropa-verify-chip__denom">/{line.quantity_ordered}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="ord-row__action">
                {editable && !group.allComplete ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    className="min-h-11 md:min-h-8"
                    onClick={() => startTransition(() => applyReceived(group.lines.map((v) => v.line)))}
                  >
                    Completar
                  </Button>
                ) : group.allComplete ? (
                  <span className="ord-row__done">
                    <Check className="size-3.5" aria-hidden />
                    Completa
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
