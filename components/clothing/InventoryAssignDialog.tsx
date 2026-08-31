"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

import {
  ClothingBottomSheet,
  ClothingSheetOption,
} from "@/components/clothing/ClothingBottomSheet";
import { assignInventoryToLocation } from "@/lib/actions/clothing/inventory";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { appRoutes } from "@/lib/constants";
import type { ClothingInventoryLotWithDetails, ClothingStorageLocationNode } from "@/lib/types/db";

import { buildBoxPath, flattenBoxNodes } from "@/lib/clothing/storageBoxes";

export function InventoryAssignDialog({
  lot,
  storageTree,
  onClose,
}: {
  lot: ClothingInventoryLotWithDetails;
  storageTree: ClothingStorageLocationNode[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const boxes = useMemo(() => flattenBoxNodes(storageTree), [storageTree]);
  const [boxId, setBoxId] = useState(boxes[0]?.id ?? "");

  const selectedPath = boxId ? buildBoxPath(boxId, storageTree) : null;

  function handleAssign() {
    if (!boxId) {
      toast.error("Selecciona una caja");
      return;
    }

    startTransition(async () => {
      const result = await assignInventoryToLocation({
        lot_id: lot.id,
        storage_location_id: boxId,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Stock ubicado en almacén");
      onClose();
      router.refresh();
    });
  }

  return (
    <ClothingBottomSheet
      open
      onClose={onClose}
      title="Asignar ubicación"
      description={`${lot.product.name} · Talla ${formatClothingSize(lot.size)} · ${lot.quantity} uds.`}
      primaryAction={{
        label: "Asignar en caja",
        pending,
        disabled: !boxId,
        onClick: handleAssign,
      }}
      secondaryAction={{
        label: "Cancelar",
        onClick: onClose,
      }}
    >
      {boxes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--club-border)] px-4 py-6 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[var(--club-brand-soft)] text-brand">
            <MapPin className="size-4" aria-hidden />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">No hay cajas disponibles</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea armarios, baldas y cajas en el árbol de ubicaciones.
          </p>
          <Link
            href={appRoutes.clothing.locations}
            className="btn-secondary btn-primary--block mt-4 min-h-11"
            onClick={onClose}
          >
            Ir a ubicaciones
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Selecciona caja
          </p>
          <div className="flex max-h-[min(40dvh,280px)] flex-col gap-2 overflow-y-auto overscroll-contain">
            {boxes.map((box) => {
              const path = buildBoxPath(box.id, storageTree) ?? box.label;
              return (
                <ClothingSheetOption
                  key={box.id}
                  selected={boxId === box.id}
                  onSelect={() => setBoxId(box.id)}
                  className="gap-2.5"
                >
                  <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 text-left leading-snug">{path}</span>
                </ClothingSheetOption>
              );
            })}
          </div>
          {selectedPath ? (
            <p className="rounded-md bg-[var(--club-surface-2)] px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Destino: </span>
              {selectedPath}
            </p>
          ) : null}
        </div>
      )}
    </ClothingBottomSheet>
  );
}
