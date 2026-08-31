"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

import {
  ClothingBottomSheet,
  ClothingSheetOption,
} from "@/components/clothing/ClothingBottomSheet";
import { ProductPicker } from "@/components/clothing/ProductPicker";
import { SizePicker } from "@/components/clothing/SizePicker";
import { Label } from "@/components/club/Label";
import { createManualInventoryLotAction } from "@/lib/actions/clothing/inventory";
import { buildBoxPath, flattenBoxNodes } from "@/lib/clothing/storageBoxes";
import type {
  ClothingProduct,
  ClothingSize,
  ClothingStorageLocationNode,
} from "@/lib/types/db";

export function ManualInventorySheet({
  open,
  onClose,
  products,
  storageTree,
}: {
  open: boolean;
  onClose: () => void;
  products: ClothingProduct[];
  storageTree: ClothingStorageLocationNode[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const boxes = useMemo(() => flattenBoxNodes(storageTree), [storageTree]);

  const [productId, setProductId] = useState("");
  const [size, setSize] = useState<ClothingSize | "">("");
  const [quantity, setQuantity] = useState("1");
  const [assignBox, setAssignBox] = useState(false);
  const [boxId, setBoxId] = useState("");
  const [notes, setNotes] = useState("");

  const selectedPath = boxId ? buildBoxPath(boxId, storageTree) : null;

  function resetForm() {
    setProductId("");
    setSize("");
    setQuantity("1");
    setAssignBox(false);
    setBoxId("");
    setNotes("");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleSubmit() {
    if (!productId) {
      toast.error("Selecciona una prenda");
      return;
    }
    if (!size) {
      toast.error("Selecciona una talla");
      return;
    }
    const qty = Number.parseInt(quantity, 10);
    if (!Number.isFinite(qty) || qty < 1) {
      toast.error("Indica una cantidad válida");
      return;
    }
    if (assignBox && !boxId) {
      toast.error("Selecciona una caja o desactiva la ubicación");
      return;
    }

    startTransition(async () => {
      const result = await createManualInventoryLotAction({
        product_id: productId,
        size,
        quantity: qty,
        storage_location_id: assignBox && boxId ? boxId : null,
        notes: notes.trim() || undefined,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(assignBox ? "Stock añadido y ubicado" : "Stock añadido (pendiente ubicar)");
      handleClose();
      router.refresh();
    });
  }

  return (
    <ClothingBottomSheet
      open={open}
      onClose={handleClose}
      title="Añadir stock"
      description="Saldos iniciales o sobrante sin pedido a proveedor."
      primaryAction={{
        label: "Guardar stock",
        pending,
        disabled: !productId || !size,
        onClick: handleSubmit,
      }}
      secondaryAction={{
        label: "Cancelar",
        onClick: handleClose,
      }}
    >
      <div className="flex flex-col gap-4">
        <ProductPicker products={products} value={productId} onChange={setProductId} id="manual-product" />
        <SizePicker value={size} onChange={setSize} id="manual-size" />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="manual-quantity">Cantidad</Label>
          <input
            id="manual-quantity"
            type="number"
            min={1}
            max={9999}
            inputMode="numeric"
            className="form-input min-h-11 tabular-nums"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="manual-notes">Notas (opcional)</Label>
          <textarea
            id="manual-notes"
            rows={2}
            maxLength={500}
            placeholder="Ej. Sobrante temporada 24/25"
            className="form-input min-h-[4.5rem] resize-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="rounded-lg border border-[var(--club-border)] p-3">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              className="size-4 rounded border-[var(--club-border)] accent-brand"
              checked={assignBox}
              onChange={(e) => {
                setAssignBox(e.target.checked);
                if (!e.target.checked) setBoxId("");
              }}
            />
            <span className="text-sm font-medium text-foreground">Ubicar en caja ahora</span>
          </label>

          {assignBox ? (
            boxes.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No hay cajas creadas. El stock quedará pendiente de ubicar.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Selecciona caja
                </p>
                <div className="flex max-h-[min(32dvh,220px)] flex-col gap-2 overflow-y-auto overscroll-contain">
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
            )
          ) : null}
        </div>
      </div>
    </ClothingBottomSheet>
  );
}
