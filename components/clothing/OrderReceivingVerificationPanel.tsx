"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { appToast } from "@/lib/toast";

import { Button } from "@/components/club/Button";
import { OrderLineReceivedEditor } from "@/components/clothing/OrderLineReceivedEditor";
import { updateOrderLineReceived } from "@/lib/actions/clothing/orders";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import {
  summarizeOrderReceiving,
  type LineReceivingState,
  type ReceivingProductGroup,
} from "@/lib/clothing/orderReceiving";
import type { ClothingOrderLineWithProduct } from "@/lib/types/db";
import { cn } from "@/lib/utils";

function stateLabel(state: LineReceivingState, missing: number, excess: number): string {
  if (state === "complete") return "Completo";
  if (state === "excess") return `Exceso +${excess}`;
  if (state === "short") return `Faltan ${missing}`;
  return "Sin recibir";
}

function stateClass(state: LineReceivingState): string {
  if (state === "complete") return "text-success";
  if (state === "excess") return "text-[var(--club-info-strong)]";
  return "text-[var(--club-warning-strong)]";
}

function ProductGroupCard({
  group,
  editable,
  pending,
  onMarkComplete,
}: {
  group: ReceivingProductGroup;
  editable: boolean;
  pending: boolean;
  onMarkComplete: (group: ReceivingProductGroup) => void;
}) {
  const summary = group.allComplete
    ? `${group.completeSizes}/${group.totalSizes} tallas OK`
    : group.missingUnits > 0
      ? `Faltan ${group.missingUnits} uds · ${group.completeSizes}/${group.totalSizes} tallas OK`
      : group.excessUnits > 0
        ? `Exceso ${group.excessUnits} uds · ${group.completeSizes}/${group.totalSizes} tallas OK`
        : `${group.completeSizes}/${group.totalSizes} tallas OK`;

  return (
    <article
      className={cn(
        "ropa-verify-group",
        group.allComplete && "ropa-verify-group--complete",
      )}
    >
      <div className="ropa-verify-group__head">
        <div className="min-w-0">
          <h3 className="ropa-verify-group__title">{group.productLabel}</h3>
          <p
            className={cn(
              "ropa-verify-group__summary",
              group.allComplete ? "text-success" : "text-muted-foreground",
            )}
          >
            {summary}
          </p>
        </div>
        {editable && !group.allComplete ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            className="min-h-11 shrink-0 md:min-h-8"
            onClick={() => onMarkComplete(group)}
          >
            Marcar prenda completa
          </Button>
        ) : null}
        {group.allComplete ? (
          <span className="ropa-verify-group__done">
            <Check className="size-3.5" aria-hidden />
            Completa
          </span>
        ) : null}
      </div>

      <ul className="ropa-verify-sizes">
        {group.lines.map(({ line, state, missing, excess }) => (
          <li key={line.id} className="ropa-verify-size">
            <div className="ropa-verify-size__label">
              <p className="font-medium text-foreground">{formatClothingSize(line.size)}</p>
              <p className={cn("text-xs font-medium", stateClass(state))}>
                {stateLabel(state, missing, excess)}
              </p>
            </div>

            <div className="ropa-verify-size__score">
              {editable ? (
                <OrderLineReceivedEditor line={line} layout="table" />
              ) : (
                <span className="ropa-digit ropa-digit--sm">{line.quantity_received}</span>
              )}
              <span className="ropa-verify-size__denom">
                / <span className="ropa-digit">{line.quantity_ordered}</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function OrderReceivingVerificationPanel({
  lines,
  editable = true,
}: {
  lines: ClothingOrderLineWithProduct[];
  editable?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const summary = summarizeOrderReceiving(lines);

  async function applyReceived(
    targets: ClothingOrderLineWithProduct[],
    mode: "ordered" | "zero",
  ) {
    const updates = targets.filter((line) => {
      const next = mode === "ordered" ? line.quantity_ordered : 0;
      return line.quantity_received !== next;
    });
    if (updates.length === 0) {
      appToast.success("Ya estaba al día");
      return;
    }

    for (const line of updates) {
      const result = await updateOrderLineReceived({
        line_id: line.id,
        quantity_received: mode === "ordered" ? line.quantity_ordered : 0,
      });
      if (!result.ok) {
        appToast.error(result.error);
        router.refresh();
        return;
      }
    }
    appToast.success(
      mode === "ordered"
        ? updates.length === 1
          ? "Prenda marcada como completa"
          : "Pedido marcado como recibido"
        : "Cantidades reiniciadas",
    );
    router.refresh();
  }

  function markProductComplete(group: ReceivingProductGroup) {
    startTransition(() => applyReceived(group.lines.map((v) => v.line), "ordered"));
  }

  function markAllComplete() {
    startTransition(() => applyReceived(lines, "ordered"));
  }

  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground">Este pedido no tiene líneas.</p>;
  }

  return (
    <div id="verificacion-recepcion" className="flex flex-col gap-4 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="ropa-section-heading">Verificación</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Recibidas / pedidas por prenda y talla.
          </p>
        </div>
        {editable && !summary.allComplete ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            className="min-h-11 md:min-h-8"
            onClick={markAllComplete}
          >
            Marcar todo recibido
          </Button>
        ) : null}
      </div>

      <div className="ropa-score-strip ropa-score-strip--compact" aria-label="Resumen recepción">
        <div className="ropa-score-cell">
          <span className="ropa-score-cell__label">Pedidas</span>
          <span className="ropa-digit ropa-digit--md">{summary.orderedUnits}</span>
        </div>
        <div className="ropa-score-cell">
          <span className="ropa-score-cell__label">Recibidas</span>
          <span className="ropa-digit ropa-digit--md">{summary.receivedUnits}</span>
        </div>
        <div className="ropa-score-cell ropa-score-cell--wide">
          {summary.missingUnits > 0 ? (
            <p className="inline-flex items-center gap-1.5 text-sm text-[var(--club-warning-strong)]">
              <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
              Faltan <span className="ropa-digit">{summary.missingUnits}</span> uds
            </p>
          ) : (
            <p className="text-sm font-medium text-success">Recepción completa</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {summary.groups.map((group) => (
          <ProductGroupCard
            key={group.productId}
            group={group}
            editable={editable}
            pending={pending}
            onMarkComplete={markProductComplete}
          />
        ))}
      </div>
    </div>
  );
}
