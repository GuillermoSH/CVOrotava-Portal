"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import { FormTextarea } from "@/components/club/forms";
import { writeOffInventoryAction } from "@/lib/actions/clothing/inventory";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { formatJerseyNumber } from "@/lib/clothing/formatJersey";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import { stockPoolKey, type StockPool } from "@/lib/clothing/stockSources";
import { appToast } from "@/lib/toast";

export function InventoryBoxWriteOffSheet({
  storageLocationId,
  locationLabel,
  pools,
  onClose,
}: {
  storageLocationId: string | null;
  locationLabel: string;
  pools: StockPool[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      pools.map((pool) => [
        stockPoolKey(pool.productId, pool.size, pool.storageLocationId, pool.jerseyNumber),
        "0",
      ]),
    ),
  );

  const lines = useMemo(() => {
    return pools.flatMap((pool) => {
      const key = stockPoolKey(pool.productId, pool.size, pool.storageLocationId, pool.jerseyNumber);
      const qty = Number.parseInt(quantities[key] ?? "0", 10);
      if (!Number.isFinite(qty) || qty <= 0) return [];
      return [
        {
          product_id: pool.productId,
          size: pool.size,
          storage_location_id: storageLocationId,
          quantity: qty,
          jersey_number: pool.jerseyNumber,
          max: pool.quantity,
          key,
        },
      ];
    });
  }, [pools, quantities, storageLocationId]);

  const invalid = lines.some((line) => line.quantity > line.max);

  function handleSubmit() {
    if (lines.length === 0) {
      appToast.error("Indica cuántas unidades quitar de al menos una prenda");
      return;
    }
    if (invalid) {
      appToast.error("Hay cantidades mayores que el stock de la caja");
      return;
    }

    startTransition(async () => {
      const result = await writeOffInventoryAction({
        storage_location_id: storageLocationId,
        notes: notes.trim() || undefined,
        lines: lines.map(({ product_id, size, storage_location_id, quantity, jersey_number }) => ({
          product_id,
          size,
          storage_location_id,
          quantity,
          jersey_number,
        })),
      });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      const units = lines.reduce((sum, line) => sum + line.quantity, 0);
      appToast.success(units === 1 ? "1 ud. eliminada del inventario" : `${units} uds. eliminadas del inventario`);
      onClose();
      router.refresh();
    });
  }

  return (
    <ClothingBottomSheet
      open
      onClose={onClose}
      title="Eliminar stock"
      description={`${locationLabel}. Esto no es una entrega: las unidades salen del inventario.`}
      primaryAction={{
        label: "Eliminar del inventario",
        pending,
        variant: "destructive",
        disabled: lines.length === 0 || invalid,
        onClick: handleSubmit,
      }}
      secondaryAction={{
        label: "Cancelar",
        onClick: onClose,
      }}
    >
      <div className="flex flex-col gap-4">
        {pools.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay prendas en esta ubicación.</p>
        ) : (
          <ul className="flex max-h-[min(48dvh,360px)] flex-col gap-3 overflow-y-auto overscroll-contain pr-0.5">
            {pools.map((pool) => {
              const key = stockPoolKey(
                pool.productId,
                pool.size,
                pool.storageLocationId,
                pool.jerseyNumber,
              );
              const product = pool.lots[0]?.product;
              return (
                <li key={key} className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {product ? formatProductShort(product) : "Prenda"}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatClothingSize(pool.size)}
                      {pool.jerseyNumber != null ? ` · ${formatJerseyNumber(pool.jerseyNumber)}` : null}
                      {" · "}
                      {pool.quantity} uds.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <label htmlFor={`writeoff-${key}`} className="text-[11px] text-muted-foreground">
                      Quitar
                    </label>
                    <input
                      id={`writeoff-${key}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={pool.quantity}
                      className="form-input min-h-11 w-[4.75rem] tabular-nums md:min-h-9"
                      value={quantities[key] ?? "0"}
                      onChange={(e) =>
                        setQuantities((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <FormTextarea
          label="Motivo (opcional)"
          name="writeoff-notes"
          id="writeoff-notes"
          rows={2}
          maxLength={500}
          placeholder="Ej. Defectuosa / recuento"
          className="min-h-[4.5rem] resize-none"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </ClothingBottomSheet>
  );
}
