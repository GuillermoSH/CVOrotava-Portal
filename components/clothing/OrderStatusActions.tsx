"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { appToast } from "@/lib/toast";

import { Button } from "@/components/club/Button";
import { ConfirmDialog } from "@/components/club/ConfirmDialog";
import {
  ClothingBottomSheet,
  ClothingSheetOption,
} from "@/components/clothing/ClothingBottomSheet";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { updateOrderStatus } from "@/lib/actions/clothing/orders";
import {
  getForwardOrderTransitions,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TRANSITIONS,
} from "@/lib/clothing/constants";
import type { ClothingOrderStatus } from "@/lib/types/db";

const transitionLabels: Partial<Record<ClothingOrderStatus, string>> = {
  ordered: "Marcar como pedido enviado",
  received: "Marcar como recibido",
  at_serigraphy: "Enviar a serigrafía",
  returned_from_serigraphy: "Registrar vuelta de serigrafía",
  closed: "Cerrar pedido",
};

type ConfirmKind = "serigraphy_missing" | "inventory" | null;

export function OrderStatusActions({
  orderId,
  status,
  missingUnits = 0,
  missingSizes = 0,
}: {
  orderId: string;
  status: ClothingOrderStatus;
  missingUnits?: number;
  missingSizes?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [confirmNext, setConfirmNext] = useState<ClothingOrderStatus | null>(null);
  const [reopenDraftOpen, setReopenDraftOpen] = useState(false);

  const forwardStatuses = getForwardOrderTransitions(status);
  const canReopenDraft = ORDER_STATUS_TRANSITIONS[status].includes("draft");

  function runTransition(next: ClothingOrderStatus) {
    startTransition(async () => {
      const result = await updateOrderStatus({ order_id: orderId, status: next });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success(
        next === "draft"
          ? "Pedido vuelto a borrador"
          : `Estado actualizado: ${ORDER_STATUS_LABELS[next]}`,
      );
      setSheetOpen(false);
      setConfirmNext(null);
      setConfirmKind(null);
      setReopenDraftOpen(false);
      router.refresh();
    });
  }

  function handleTransition(next: ClothingOrderStatus) {
    if (next === "at_serigraphy" && missingUnits > 0) {
      setConfirmNext(next);
      setConfirmKind("serigraphy_missing");
      return;
    }
    if (next === "returned_from_serigraphy") {
      setConfirmNext(next);
      setConfirmKind("inventory");
      return;
    }
    runTransition(next);
  }

  if (forwardStatuses.length === 0 && !canReopenDraft) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay más transiciones en este pedido.
      </p>
    );
  }

  const primaryNext = forwardStatuses[0];
  const primaryLabel = primaryNext
    ? (transitionLabels[primaryNext] ?? ORDER_STATUS_LABELS[primaryNext])
    : "Cambiar estado";
  const hasMultiple = forwardStatuses.length > 1;

  const confirmTitle =
    confirmKind === "serigraphy_missing"
      ? "Recepción incompleta"
      : "Generar inventario";
  const confirmDescription =
    confirmKind === "serigraphy_missing"
      ? `Faltan ${missingUnits} uds en ${missingSizes} talla${missingSizes === 1 ? "" : "s"}. ¿Enviar igual a serigrafía?`
      : "Se crearán lotes pendientes de ubicar en almacén.";
  const confirmPrimaryLabel =
    confirmKind === "serigraphy_missing" ? "Enviar igual" : "Continuar";

  /** En borrador la ficha ya usa sticky para «Guardar cambios»; botones inline en móvil. */
  const useInlineMobileActions = status === "draft";

  return (
    <>
      <div
        className={
          useInlineMobileActions ? "flex flex-wrap gap-2" : "hidden flex-wrap gap-2 md:flex"
        }
      >
        {forwardStatuses.map((next) => (
          <Button
            key={next}
            type="button"
            variant={next === "closed" ? "secondary" : "primary"}
            size="sm"
            disabled={pending}
            onClick={() => handleTransition(next)}
          >
            {transitionLabels[next] ?? ORDER_STATUS_LABELS[next]}
          </Button>
        ))}
        {canReopenDraft ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => setReopenDraftOpen(true)}
          >
            Volver a borrador
          </Button>
        ) : null}
      </div>

      {!useInlineMobileActions ? (
        <div className="md:hidden">
          <ClothingStickyActionBar
            actions={[
              ...(primaryNext
                ? [
                    {
                      type: "button" as const,
                      label: hasMultiple ? "Cambiar estado" : primaryLabel,
                      pending,
                      onClick: () => setSheetOpen(true),
                    },
                  ]
                : []),
              ...(canReopenDraft
                ? [
                    {
                      type: "button" as const,
                      label: "Volver a borrador",
                      pending,
                      variant: "secondary" as const,
                      onClick: () => setReopenDraftOpen(true),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      ) : null}

      <ClothingBottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Siguiente paso"
        description="Elige el nuevo estado del pedido."
      >
        <div className="flex flex-col gap-2">
          {forwardStatuses.map((next) => (
            <ClothingSheetOption
              key={next}
              onSelect={() => handleTransition(next)}
            >
              {transitionLabels[next] ?? ORDER_STATUS_LABELS[next]}
            </ClothingSheetOption>
          ))}
        </div>
      </ClothingBottomSheet>

      <ClothingBottomSheet
        open={confirmKind !== null && confirmNext !== null}
        onClose={() => {
          setConfirmKind(null);
          setConfirmNext(null);
        }}
        title={confirmTitle}
        description={confirmDescription}
        primaryAction={{
          label: confirmPrimaryLabel,
          pending,
          onClick: () => {
            if (confirmNext) runTransition(confirmNext);
          },
        }}
        secondaryAction={{
          label: "Cancelar",
          onClick: () => {
            setConfirmKind(null);
            setConfirmNext(null);
          },
        }}
      />

      <ConfirmDialog
        open={reopenDraftOpen}
        onClose={() => {
          if (!pending) setReopenDraftOpen(false);
        }}
        title="Volver a borrador"
        description="El pedido dejará de estar marcado como enviado. Podrás editar el contenido; las unidades recibidas se pondrán a cero y tendrás que volver a confirmar el envío."
        confirmLabel="Volver a borrador"
        destructive
        pending={pending}
        onConfirm={() => runTransition("draft")}
      />
    </>
  );
}
