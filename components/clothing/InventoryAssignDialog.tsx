"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import { WarehouseCrate } from "@/components/clothing/WarehouseCrate";
import { assignInventoryToLocation } from "@/lib/actions/clothing/inventory";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import { boxHomeLabel, collectBoxHomes, flattenBoxNodes } from "@/lib/clothing/storageBoxes";
import { appRoutes } from "@/lib/constants";
import type { ClothingInventoryLotWithDetails, ClothingStorageLocationNode } from "@/lib/types/db";
import { appToast } from "@/lib/toast";

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
  const homes = useMemo(() => collectBoxHomes(storageTree), [storageTree]);
  const [boxId, setBoxId] = useState(boxes[0]?.id ?? "");

  function handleAssign() {
    if (!boxId) {
      appToast.error("Selecciona una caja");
      return;
    }

    startTransition(async () => {
      const result = await assignInventoryToLocation({
        lot_id: lot.id,
        storage_location_id: boxId,
      });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success("Stock ubicado en caja");
      onClose();
      router.refresh();
    });
  }

  return (
    <ClothingBottomSheet
      open
      onClose={onClose}
      title="Ubicar en caja"
      description={`${formatProductShort(lot.product)} · ${formatClothingSize(lot.size)} · ${lot.quantity} uds.`}
      primaryAction={{
        label: "Asignar a esta caja",
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
          <p className="text-sm font-medium text-foreground">No hay cajas</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea una caja suelta para poder identificar el stock.
          </p>
          <Link
            href={appRoutes.clothing.locations}
            className="btn-secondary btn-primary--block mt-4 min-h-11"
            onClick={onClose}
          >
            Ir a cajas
          </Link>
        </div>
      ) : (
        <div className="flex max-h-[min(42dvh,320px)] flex-col gap-2 overflow-y-auto overscroll-contain">
          {boxes.map((box) => {
            const home = homes.find((item) => item.box.id === box.id);
            return (
              <WarehouseCrate
                key={box.id}
                variant="pick"
                selected={boxId === box.id}
                onSelect={() => setBoxId(box.id)}
                code={box.code}
                label={box.label}
                home={home ? boxHomeLabel(home) : undefined}
              />
            );
          })}
        </div>
      )}
    </ClothingBottomSheet>
  );
}
