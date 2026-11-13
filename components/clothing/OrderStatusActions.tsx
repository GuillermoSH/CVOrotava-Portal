"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/club/Button";
import { ConfirmDialog } from "@/components/club/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/club/DropdownMenu";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { deleteOrderAction, updateOrderStatus } from "@/lib/actions/clothing/orders";
import {
  getForwardOrderTransitions,
  ORDER_BACKWARD_TRANSITIONS,
  ORDER_STATUS_LABELS,
} from "@/lib/clothing/constants";
import { appRoutes } from "@/lib/constants";
import { appToast } from "@/lib/toast";
import type { ClothingOrderStatus } from "@/lib/types/db";

const transitionLabels: Partial<Record<ClothingOrderStatus, string>> = {
  ordered: "Marcar como pedido enviado",
  received: "Marcar como recibido",
  at_serigraphy: "Enviar a serigrafía",
  returned_from_serigraphy: "Registrar vuelta de serigrafía",
  closed: "Cerrar pedido",
};

/** Qué pasa al volver atrás a cada estado (se enseña antes de confirmar). */
const backwardConsequence: Partial<Record<ClothingOrderStatus, string>> = {
  draft:
    "El pedido dejará de estar marcado como enviado y podrás editar su contenido. Las unidades recibidas se pondrán a cero y tendrás que volver a confirmar el envío.",
  ordered: "El pedido vuelve a «Pedido enviado». Las unidades recibidas que anotaste se conservan.",
  received: "El pedido vuelve a «Recibido». Podrás revisar la recepción o enviarlo de nuevo a serigrafía.",
  at_serigraphy:
    "El pedido vuelve a «En serigrafía». Se borrarán los lotes que se crearon al volver (siguen sin ubicar ni entregar) y se generarán de nuevo al registrar la vuelta.",
  returned_from_serigraphy: "Se reabre el pedido: volverá a «Vuelta serigrafía» con su stock tal como está.",
};

type Dialog =
  | { kind: "forward-serigraphy-missing" }
  | { kind: "forward-inventory" }
  | { kind: "backward"; target: ClothingOrderStatus }
  | { kind: "delete" }
  | null;

export function OrderStatusActions({
  orderId,
  reference,
  status,
  missingUnits = 0,
  missingSizes = 0,
  stockBlocker = null,
  leadAction = null,
}: {
  orderId: string;
  /** Referencia del pedido: hay que escribirla para volver a borrador o eliminar. */
  reference: string;
  status: ClothingOrderStatus;
  missingUnits?: number;
  missingSizes?: number;
  /**
   * Paso pendiente que pasa a ser el botón principal (p. ej. «Ubicar lotes»); el avance de estado
   * queda como secundario hasta que esté hecho.
   */
  leadAction?: { label: string; href: string } | null;
  /** Motivo por el que no se puede deshacer el stock generado (vuelta de serigrafía o cerrado). */
  stockBlocker?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<Dialog>(null);

  const next = getForwardOrderTransitions(status)[0] ?? null;
  const back = ORDER_BACKWARD_TRANSITIONS[status][0] ?? null;
  // Solo volver desde «Vuelta serigrafía» borra stock; lo demás no tiene requisitos de stock.
  const backBlocker = status === "returned_from_serigraphy" ? stockBlocker : null;
  const deleteBlocker =
    status === "returned_from_serigraphy" || status === "closed" ? stockBlocker : null;

  function runTransition(target: ClothingOrderStatus) {
    startTransition(async () => {
      const result = await updateOrderStatus({ order_id: orderId, status: target });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success(
        target === "draft"
          ? "Pedido vuelto a borrador"
          : `Estado actualizado: ${ORDER_STATUS_LABELS[target]}`,
      );
      setDialog(null);
      router.refresh();
    });
  }

  function runDelete() {
    startTransition(async () => {
      const result = await deleteOrderAction({ order_id: orderId });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success("Pedido eliminado");
      setDialog(null);
      router.push(appRoutes.clothing.orders);
      router.refresh();
    });
  }

  function handleForward() {
    if (!next) return;
    if (next === "at_serigraphy" && missingUnits > 0) {
      setDialog({ kind: "forward-serigraphy-missing" });
      return;
    }
    if (next === "returned_from_serigraphy") {
      setDialog({ kind: "forward-inventory" });
      return;
    }
    runTransition(next);
  }

  const nextLabel = next ? (transitionLabels[next] ?? ORDER_STATUS_LABELS[next]) : null;
  const closeDialog = () => {
    if (!pending) setDialog(null);
  };

  const blockedBackward = dialog?.kind === "backward" && backBlocker;
  const blockedDelete = dialog?.kind === "delete" && deleteBlocker;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {leadAction ? (
          <Link
            href={leadAction.href}
            className="btn-primary hidden min-h-10 items-center px-5 md:inline-flex"
          >
            {leadAction.label}
          </Link>
        ) : null}

        {nextLabel ? (
          <Button
            type="button"
            variant={leadAction ? "secondary" : "primary"}
            className={
              leadAction
                ? "hidden min-h-10 md:inline-flex"
                : "hidden min-h-10 px-5 md:inline-flex"
            }
            disabled={pending}
            onClick={handleForward}
          >
            {pending ? "Guardando…" : nextLabel}
          </Button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger
            className="btn-secondary inline-flex min-h-11 items-center gap-1.5 md:min-h-10"
            aria-label="Más opciones del pedido"
            disabled={pending}
          >
            <MoreHorizontal className="size-4" aria-hidden />
            <span className="sr-only md:not-sr-only">Más opciones</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-64">
            {leadAction && nextLabel ? (
              <DropdownMenuItem className="md:hidden" onClick={handleForward}>
                {nextLabel}
              </DropdownMenuItem>
            ) : null}
            {back ? (
              <DropdownMenuItem onClick={() => setDialog({ kind: "backward", target: back })}>
                Volver a «{ORDER_STATUS_LABELS[back]}»
              </DropdownMenuItem>
            ) : null}
            {back ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem variant="destructive" onClick={() => setDialog({ kind: "delete" })}>
              Eliminar pedido
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {leadAction || nextLabel ? (
        <div className="md:hidden">
          <ClothingStickyActionBar
            actions={[
              leadAction
                ? { type: "link", label: leadAction.label, href: leadAction.href }
                : {
                    type: "button",
                    label: nextLabel ?? "",
                    pending,
                    onClick: handleForward,
                  },
            ]}
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={dialog?.kind === "forward-serigraphy-missing" || dialog?.kind === "forward-inventory"}
        onClose={closeDialog}
        title={
          dialog?.kind === "forward-serigraphy-missing"
            ? "Enviar a serigrafía con faltantes"
            : "Registrar la vuelta de serigrafía"
        }
        description={
          dialog?.kind === "forward-serigraphy-missing"
            ? `Faltan ${missingUnits} uds en ${missingSizes} talla${missingSizes === 1 ? "" : "s"}. Lo no recibido no entrará al almacén después.`
            : "Se crearán los lotes pendientes de ubicar en el almacén del club."
        }
        confirmLabel={dialog?.kind === "forward-serigraphy-missing" ? "Enviar igual" : "Registrar vuelta"}
        pending={pending}
        onConfirm={() => {
          if (next) runTransition(next);
        }}
      />

      <ConfirmDialog
        open={dialog?.kind === "backward"}
        onClose={closeDialog}
        title={
          blockedBackward
            ? "No se puede volver atrás"
            : dialog?.kind === "backward"
              ? `Volver a «${ORDER_STATUS_LABELS[dialog.target]}»`
              : ""
        }
        description={
          blockedBackward
            ? (backBlocker ?? undefined)
            : dialog?.kind === "backward"
              ? backwardConsequence[dialog.target]
              : undefined
        }
        confirmLabel={blockedBackward ? "Entendido" : "Volver atrás"}
        destructive={!blockedBackward}
        requireText={
          dialog?.kind === "backward" && dialog.target === "draft" && !blockedBackward
            ? reference
            : undefined
        }
        pending={pending}
        onConfirm={() => {
          if (blockedBackward) setDialog(null);
          else if (dialog?.kind === "backward") runTransition(dialog.target);
        }}
      />

      <ConfirmDialog
        open={dialog?.kind === "delete"}
        onClose={closeDialog}
        title={blockedDelete ? "No se puede eliminar" : "Eliminar pedido"}
        description={
          blockedDelete
            ? (deleteBlocker ?? undefined)
            : "Se borrará el pedido con sus líneas y entregas previstas (y su stock si aún está sin tocar). Esta acción no se puede deshacer."
        }
        confirmLabel={blockedDelete ? "Entendido" : "Eliminar"}
        destructive={!blockedDelete}
        requireText={blockedDelete ? undefined : reference}
        pending={pending}
        onConfirm={() => {
          if (blockedDelete) setDialog(null);
          else runDelete();
        }}
      />
    </>
  );
}
