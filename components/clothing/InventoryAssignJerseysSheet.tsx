"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import { FormTextarea } from "@/components/club/forms";
import { assignJerseyNumbersAction } from "@/lib/actions/clothing/inventory";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { parseJerseyNumberList } from "@/lib/clothing/formatJersey";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import type { ClothingInventoryLotWithDetails } from "@/lib/types/db";
import { appToast } from "@/lib/toast";

export function InventoryAssignJerseysSheet({
  lot,
  onClose,
}: {
  lot: ClothingInventoryLotWithDetails;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");

  function handleSubmit() {
    let numbers: number[];
    try {
      numbers = parseJerseyNumberList(text);
    } catch (error) {
      appToast.error(error instanceof Error ? error.message : "Revisa los dorsales");
      return;
    }
    if (numbers.length === 0) {
      appToast.error("Indica al menos un dorsal");
      return;
    }
    if (numbers.length > lot.quantity) {
      appToast.error(`Este lote solo tiene ${lot.quantity} uds.`);
      return;
    }
    if (new Set(numbers).size !== numbers.length) {
      appToast.error("Hay dorsales repetidos");
      return;
    }

    startTransition(async () => {
      const result = await assignJerseyNumbersAction({
        lot_id: lot.id,
        jersey_numbers: numbers,
      });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success(
        numbers.length === 1
          ? "Dorsal asignado"
          : `${numbers.length} dorsales asignados`,
      );
      onClose();
      router.refresh();
    });
  }

  return (
    <ClothingBottomSheet
      open
      onClose={onClose}
      title="Asignar dorsales"
      description={`${formatProductShort(lot.product)} · ${formatClothingSize(lot.size)} · ${lot.quantity} uds. Puedes numerar solo algunas unidades.`}
      primaryAction={{
        label: lot.quantity === 1 ? "Guardar dorsal" : "Guardar dorsales",
        pending,
        onClick: handleSubmit,
      }}
      secondaryAction={{
        label: "Cancelar",
        onClick: onClose,
      }}
    >
      <FormTextarea
        label={lot.quantity === 1 ? "Dorsal" : "Dorsales"}
        name="jersey-numbers"
        id="jersey-numbers"
        rows={lot.quantity === 1 ? 2 : 4}
        inputMode="numeric"
        placeholder={lot.quantity === 1 ? "Ej. 7" : "Ej. 7, 12, 18"}
        className="min-h-[4.5rem] resize-none"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </ClothingBottomSheet>
  );
}
