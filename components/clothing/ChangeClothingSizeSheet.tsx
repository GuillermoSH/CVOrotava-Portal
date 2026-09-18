"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import { DeliveryAddItemSheet } from "@/components/clothing/DeliveryAddItemSheet";
import { FormSelect, FormTextarea } from "@/components/club/forms";
import { Button } from "@/components/club/Button";
import { changePlayerClothingSizeAction } from "@/lib/actions/clothing/inventory";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { formatJerseyNumber } from "@/lib/clothing/formatJersey";
import { formatProductName, formatProductShort } from "@/lib/clothing/formatProduct";
import {
  buildStockPools,
  formatPoolSource,
  type StockPool,
} from "@/lib/clothing/stockSources";
import { boxHomeLabel, collectBoxHomes, flattenBoxNodes } from "@/lib/clothing/storageBoxes";
import type {
  ClothingInventoryLotWithDetails,
  ClothingPossessionItem,
  ClothingStorageLocationNode,
} from "@/lib/types/db";
import { appToast } from "@/lib/toast";

export function ChangeClothingSizeSheet({
  open,
  onClose,
  item,
  lots,
  storageTree,
}: {
  open: boolean;
  onClose: () => void;
  item: ClothingPossessionItem | null;
  lots: ClothingInventoryLotWithDetails[];
  storageTree: ClothingStorageLocationNode[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [returnBoxId, setReturnBoxId] = useState("");
  const [notes, setNotes] = useState("");
  const [updatePreference, setUpdatePreference] = useState(true);
  const [newPool, setNewPool] = useState<StockPool | null>(null);
  const [pickOpen, setPickOpen] = useState(false);

  const pools = useMemo(() => buildStockPools(lots, storageTree), [lots, storageTree]);
  const boxes = useMemo(() => flattenBoxNodes(storageTree), [storageTree]);
  const homes = useMemo(() => collectBoxHomes(storageTree), [storageTree]);

  const candidatePools = useMemo(() => {
    if (!item) return pools;
    return pools.filter((pool) => {
      if (pool.quantity <= 0) return false;
      // Prefer same product category; allow any for flexibility
      const product = pool.lots[0]?.product;
      if (!product) return false;
      if (product.category !== item.product.category) return false;
      // Exclude exact same sku still being returned (same size + jersey)
      if (
        pool.productId === item.product_id &&
        pool.size === item.size &&
        pool.jerseyNumber === item.jersey_number
      ) {
        return false;
      }
      return true;
    });
  }, [pools, item]);

  const boxOptions = useMemo(
    () => [
      { value: "", label: "Pendiente de ubicar" },
      ...boxes.map((box) => {
        const home = homes.find((h) => h.box.id === box.id);
        const place = home ? boxHomeLabel(home) : box.label;
        return { value: box.id, label: `${box.code} · ${place}` };
      }),
    ],
    [boxes, homes],
  );

  function handleClose() {
    setReturnBoxId("");
    setNotes("");
    setUpdatePreference(true);
    setNewPool(null);
    setPickOpen(false);
    onClose();
  }

  function handleSubmit() {
    if (!item) return;
    if (!newPool) {
      appToast.error("Elige la nueva talla del stock");
      return;
    }

    startTransition(async () => {
      const result = await changePlayerClothingSizeAction({
        player_id: item.player_id,
        return_line: {
          product_id: item.product_id,
          size: item.size,
          quantity: 1,
          jersey_number: item.jersey_number,
          related_movement_id: item.delivery_id,
          storage_location_id: returnBoxId || null,
        },
        deliver_line: {
          product_id: newPool.productId,
          size: newPool.size,
          storage_location_id: newPool.storageLocationId,
          quantity: 1,
          jersey_number: newPool.jerseyNumber,
        },
        notes: notes.trim() || "Cambio de talla",
        update_clothing_size_preference: updatePreference,
      });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success("Cambio de talla registrado");
      handleClose();
      router.refresh();
    });
  }

  if (!item) return null;

  return (
    <>
      <ClothingBottomSheet
        open={open && !pickOpen}
        onClose={handleClose}
        title="Cambiar talla"
        description="Se devuelve la prenda actual y se entrega otra del stock."
        primaryAction={{
          label: pending ? "Guardando…" : "Confirmar cambio",
          pending,
          disabled: !newPool,
          onClick: handleSubmit,
        }}
        secondaryAction={{
          label: "Cancelar",
          onClick: handleClose,
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-[var(--club-border)] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Devuelve
            </p>
            <p className="mt-1 font-medium text-foreground">
              {formatProductShort(item.product)} · {formatClothingSize(item.size)}
              {item.jersey_number != null ? ` · ${formatJerseyNumber(item.jersey_number)}` : ""}
            </p>
          </div>

          <FormSelect
            label="Ubicación de la devolución"
            name="size-change-return-box"
            id="size-change-return-box"
            value={returnBoxId}
            onChange={(e) => setReturnBoxId(e.target.value)}
            options={boxOptions}
          />

          <div className="rounded-xl border border-[var(--club-border)] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Entrega nueva
            </p>
            {newPool ? (
              <div className="mt-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {formatProductName(newPool.lots[0]!.product)} ·{" "}
                    {formatClothingSize(newPool.size)}
                    {newPool.jerseyNumber != null
                      ? ` · ${formatJerseyNumber(newPool.jerseyNumber)}`
                      : ""}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatPoolSource(newPool)}
                    {newPool.size !== item.size ? (
                      <span className="ml-1 text-brand">
                        (antes {formatClothingSize(item.size)})
                      </span>
                    ) : null}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-h-11 shrink-0"
                  onClick={() => setPickOpen(true)}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="mt-2 min-h-11 w-full"
                onClick={() => setPickOpen(true)}
              >
                Elegir prenda del stock
              </Button>
            )}
          </div>

          <label className="flex items-start gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-[var(--club-brand)]"
              checked={updatePreference}
              onChange={(e) => setUpdatePreference(e.target.checked)}
            />
            <span>
              Actualizar talla preferida en la ficha
              {newPool ? ` a ${formatClothingSize(newPool.size)}` : ""}
            </span>
          </label>

          <FormTextarea
            label="Notas (opcional)"
            name="size-change-notes"
            id="size-change-notes"
            rows={2}
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </ClothingBottomSheet>

      <DeliveryAddItemSheet
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        pools={candidatePools}
        remainingOnPool={(pool) => pool.quantity}
        onPick={(pool) => {
          setNewPool(pool);
          setPickOpen(false);
        }}
      />
    </>
  );
}
