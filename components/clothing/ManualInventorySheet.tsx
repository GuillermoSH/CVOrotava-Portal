"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import { ProductPicker } from "@/components/clothing/ProductPicker";
import { SizePicker } from "@/components/clothing/SizePicker";
import { WarehouseCrate } from "@/components/clothing/WarehouseCrate";
import { FormInput, FormSelect, FormTextarea } from "@/components/club/forms";
import { createManualInventoryLotAction } from "@/lib/actions/clothing/inventory";
import { boxHomeLabel, collectBoxHomes, flattenBoxNodes } from "@/lib/clothing/storageBoxes";
import { formatSeasonShort, getCurrentSeason, getSeasonSelectOptions } from "@/lib/season";
import type {
  ClothingProduct,
  ClothingSize,
  ClothingStorageLocationNode,
} from "@/lib/types/db";
import { appToast } from "@/lib/toast";

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
  const allBoxes = useMemo(() => flattenBoxNodes(storageTree), [storageTree]);
  const homes = useMemo(() => collectBoxHomes(storageTree), [storageTree]);

  const seasonOptions = useMemo(() => {
    const seasonsFromData = [
      ...products.map((p) => p.season),
      ...allBoxes.map((b) => b.season),
    ];
    return getSeasonSelectOptions(seasonsFromData, { pastCount: 4, futureCount: 0 });
  }, [products, allBoxes]);

  const [season, setSeason] = useState(getCurrentSeason());
  const [productId, setProductId] = useState("");
  const [size, setSize] = useState<ClothingSize | "">("");
  const [quantity, setQuantity] = useState("1");
  const [assignBox, setAssignBox] = useState(false);
  const [boxId, setBoxId] = useState("");
  const [notes, setNotes] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");

  const seasonProducts = useMemo(
    () =>
      products.filter(
        (product) => product.season === season && (product.is_active || product.id === productId),
      ),
    [products, season, productId],
  );

  const boxes = useMemo(
    () => allBoxes.filter((box) => box.season === season),
    [allBoxes, season],
  );

  function resetForm() {
    setSeason(getCurrentSeason());
    setProductId("");
    setSize("");
    setQuantity("1");
    setAssignBox(false);
    setBoxId("");
    setNotes("");
    setJerseyNumber("");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleSeasonChange(next: string) {
    setSeason(next);
    setProductId("");
    setBoxId("");
  }

  function handleSubmit() {
    if (!productId) {
      appToast.error("Selecciona una prenda");
      return;
    }
    if (!size) {
      appToast.error("Selecciona una talla");
      return;
    }
    const qty = Number.parseInt(quantity, 10);
    if (!Number.isFinite(qty) || qty < 1) {
      appToast.error("Indica una cantidad válida");
      return;
    }
    let jersey: number | null = null;
    if (jerseyNumber.trim()) {
      const parsed = Number.parseInt(jerseyNumber, 10);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 99) {
        appToast.error("El dorsal debe estar entre 0 y 99");
        return;
      }
      jersey = parsed;
    }
    if (jersey != null && qty !== 1) {
      appToast.error("Una prenda con dorsal es una sola unidad");
      return;
    }
    if (assignBox && !boxId) {
      appToast.error("Selecciona una caja o desactiva la ubicación");
      return;
    }

    startTransition(async () => {
      const result = await createManualInventoryLotAction({
        product_id: productId,
        size,
        quantity: jersey == null ? qty : 1,
        storage_location_id: assignBox && boxId ? boxId : null,
        notes: notes.trim() || undefined,
        jersey_number: jersey,
      });

      if (!result.ok) {
        appToast.error(result.error);
        return;
      }

      appToast.success(assignBox ? "Stock añadido y ubicado" : "Stock añadido (pendiente ubicar)");
      handleClose();
      router.refresh();
    });
  }

  return (
    <ClothingBottomSheet
      open={open}
      onClose={handleClose}
      title="Añadir stock"
      description="Selecciona temporada, prenda, talla y caja. Sirve también para años previos."
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
        <FormSelect
          label="Temporada"
          name="manual-season"
          id="manual-season"
          value={season}
          onChange={(e) => handleSeasonChange(e.target.value)}
          options={seasonOptions.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
        />

        {seasonProducts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--club-border)] px-3 py-3 text-sm text-muted-foreground">
            No hay prendas en {formatSeasonShort(season)}. Crea la prenda en Prendas o elige otra
            temporada.
          </p>
        ) : (
          <ProductPicker
            products={seasonProducts}
            value={productId}
            onChange={setProductId}
            id="manual-product"
          />
        )}

        <SizePicker value={size} onChange={setSize} id="manual-size" />

        <FormInput
          label="Dorsal (opcional)"
          name="manual-jersey"
          id="manual-jersey"
          type="number"
          min={0}
          max={99}
          inputMode="numeric"
          className="min-h-11 tabular-nums"
          placeholder="Ej. 7"
          value={jerseyNumber}
          onChange={(e) => {
            setJerseyNumber(e.target.value);
            if (e.target.value.trim()) setQuantity("1");
          }}
        />

        <FormInput
          label="Cantidad"
          name="manual-quantity"
          id="manual-quantity"
          type="number"
          min={1}
          max={jerseyNumber.trim() ? 1 : 9999}
          inputMode="numeric"
          className="min-h-11 tabular-nums"
          value={jerseyNumber.trim() ? "1" : quantity}
          disabled={Boolean(jerseyNumber.trim())}
          onChange={(e) => setQuantity(e.target.value)}
        />

        <FormTextarea
          label="Notas (opcional)"
          name="manual-notes"
          id="manual-notes"
          rows={2}
          maxLength={500}
          placeholder="Ej. Sobrante temporada 24/25"
          className="min-h-[4.5rem] resize-none"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

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
                No hay cajas en {formatSeasonShort(season)}. El stock quedará pendiente de ubicar.
              </p>
            ) : (
              <div className="mt-3 flex max-h-[min(32dvh,240px)] flex-col gap-2 overflow-y-auto overscroll-contain">
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
            )
          ) : null}
        </div>
      </div>
    </ClothingBottomSheet>
  );
}
