"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import { FormInput, FormSelect, FormTextarea } from "@/components/club/forms";
import { returnInventoryAction } from "@/lib/actions/clothing/inventory";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { formatJerseyNumber } from "@/lib/clothing/formatJersey";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import { flattenBoxNodes, boxHomeLabel, collectBoxHomes } from "@/lib/clothing/storageBoxes";
import { formatSeasonShort } from "@/lib/season";
import type {
  ClothingPossessionItem,
  ClothingStorageLocationNode,
} from "@/lib/types/db";
import { appToast } from "@/lib/toast";

export function ReturnClothingSheet({
  open,
  onClose,
  item,
  storageTree,
}: {
  open: boolean;
  onClose: () => void;
  item: ClothingPossessionItem | null;
  storageTree: ClothingStorageLocationNode[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState("1");
  const [boxId, setBoxId] = useState("");
  const [notes, setNotes] = useState("");

  const boxes = useMemo(() => flattenBoxNodes(storageTree), [storageTree]);
  const homes = useMemo(() => collectBoxHomes(storageTree), [storageTree]);

  const boxOptions = useMemo(
    () => [
      { value: "", label: "Pendiente de ubicar" },
      ...boxes.map((box) => {
        const home = homes.find((h) => h.box.id === box.id);
        const place = home ? boxHomeLabel(home) : box.label;
        return {
          value: box.id,
          label: `${box.code} · ${place}`,
        };
      }),
    ],
    [boxes, homes],
  );

  function handleClose() {
    setQuantity("1");
    setBoxId("");
    setNotes("");
    onClose();
  }

  function handleSubmit() {
    if (!item) return;
    const qty =
      item.jersey_number != null ? 1 : Number.parseInt(quantity, 10);
    if (!Number.isFinite(qty) || qty < 1) {
      appToast.error("Indica una cantidad válida");
      return;
    }
    if (qty > item.quantity) {
      appToast.error(`Solo hay ${item.quantity} uds. en posesión`);
      return;
    }

    startTransition(async () => {
      const result = await returnInventoryAction({
        player_id: item.player_id,
        product_id: item.product_id,
        size: item.size,
        quantity: qty,
        jersey_number: item.jersey_number,
        related_movement_id: item.delivery_id,
        storage_location_id: boxId || null,
        notes: notes.trim() || undefined,
      });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success(qty === 1 ? "Prenda devuelta al almacén" : `${qty} uds. devueltas al almacén`);
      handleClose();
      router.refresh();
    });
  }

  if (!item) return null;

  return (
    <ClothingBottomSheet
      open={open}
      onClose={handleClose}
      title="Devolver prenda"
      description={`${item.player_name} · ${formatProductShort(item.product)} · ${formatClothingSize(item.size)}${item.jersey_number != null ? ` · ${formatJerseyNumber(item.jersey_number)}` : ""}`}
      primaryAction={{
        label: pending ? "Devolviendo…" : "Devolver al almacén",
        pending,
        onClick: handleSubmit,
      }}
      secondaryAction={{
        label: "Cancelar",
        onClick: handleClose,
      }}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Temporada {formatSeasonShort(item.product.season)} · {item.quantity} uds. en posesión
        </p>
        {item.jersey_number == null ? (
          <FormInput
            label="Cantidad"
            name="return-quantity"
            id="return-quantity"
            type="number"
            min={1}
            max={item.quantity}
            inputMode="numeric"
            className="min-h-11 tabular-nums"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        ) : null}
        <FormSelect
          label="Ubicación en almacén"
          name="return-box"
          id="return-box"
          value={boxId}
          onChange={(e) => setBoxId(e.target.value)}
          options={boxOptions}
        />
        <FormTextarea
          label="Notas (opcional)"
          name="return-notes"
          id="return-notes"
          rows={2}
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </ClothingBottomSheet>
  );
}
