"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/club/Button";
import { FormInput, FormTextarea } from "@/components/club/forms";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import {
  PlannedDeliveriesEditor,
  plannedRowsFromDeliveries,
  plannedRowsToPayload,
  type PlannedRowDraft,
  type PlannedSkuOption,
} from "@/components/clothing/PlannedDeliveriesEditor";
import { ProductPicker } from "@/components/clothing/ProductPicker";
import { SizePicker } from "@/components/clothing/SizePicker";
import {
  createSupplierOrder,
  updateDraftOrderAction,
} from "@/lib/actions/clothing/orders";
import { formatSeasonShort, getCurrentSeason } from "@/lib/season";
import { appRoutes } from "@/lib/constants";
import type {
  ClothingOrderWithLines,
  ClothingPlannedDelivery,
  ClothingProduct,
  ClothingSize,
  PlayerWithTeam,
} from "@/lib/types/db";
import { appToast } from "@/lib/toast";

type LineDraft = {
  productId: string;
  size: ClothingSize | "";
  quantityOrdered: string;
};

const emptyLine = (): LineDraft => ({
  productId: "",
  size: "",
  quantityOrdered: "1",
});

function linesFromOrder(order: ClothingOrderWithLines): LineDraft[] {
  if (order.lines.length === 0) return [emptyLine()];
  return order.lines.map((line) => ({
    productId: line.product_id,
    size: line.size,
    quantityOrdered: String(line.quantity_ordered),
  }));
}

export function OrderForm({
  products,
  order,
  players = [],
  planned = [],
}: {
  products: ClothingProduct[];
  /** Si se pasa, el formulario edita ese borrador. */
  order?: ClothingOrderWithLines;
  /** Jugadores a los que se puede asignar prendas del pedido. */
  players?: PlayerWithTeam[];
  /** Entregas previstas ya guardadas del borrador que se edita. */
  planned?: ClothingPlannedDelivery[];
}) {
  const isEdit = Boolean(order);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [supplierName, setSupplierName] = useState(order?.supplier_name ?? "");
  const [season, setSeason] = useState(order?.season ?? getCurrentSeason);
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [lines, setLines] = useState<LineDraft[]>(() =>
    order ? linesFromOrder(order) : [emptyLine()],
  );
  const [plannedRows, setPlannedRows] = useState<PlannedRowDraft[]>(() =>
    plannedRowsFromDeliveries(planned),
  );

  // Prendas y tallas del pedido (sumando líneas repetidas): lo que se puede asignar a jugadores.
  const plannedOptions = useMemo<PlannedSkuOption[]>(() => {
    const bySku = new Map<string, PlannedSkuOption>();
    for (const line of lines) {
      if (!line.productId || !line.size) continue;
      const key = `${line.productId}::${line.size}`;
      const quantity = Math.max(0, Math.floor(Number(line.quantityOrdered)) || 0);
      const existing = bySku.get(key);
      if (existing) existing.ordered += quantity;
      else bySku.set(key, { productId: line.productId, size: line.size, ordered: quantity });
    }
    return [...bySku.values()];
  }, [lines]);

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--club-border)] px-6 py-10 text-center">
        <p className="font-medium text-foreground">No hay prendas activas</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Configura el catálogo de prendas antes de crear un pedido.
        </p>
        <Link href={appRoutes.clothing.products} className="btn-primary mt-5 inline-flex min-h-11">
          Ir a prendas
        </Link>
      </div>
    );
  }

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const plannedPayload = plannedRowsToPayload(plannedRows);
    if (!plannedPayload.ok) {
      appToast.error(plannedPayload.error);
      return;
    }
    startTransition(async () => {
      const payload = {
        supplier_name: supplierName,
        season,
        notes: notes || undefined,
        lines: lines.map((line) => ({
          product_id: line.productId,
          size: line.size as ClothingSize,
          quantity_ordered: Number(line.quantityOrdered),
        })),
        planned: plannedPayload.rows,
      };

      const result = isEdit && order
        ? await updateDraftOrderAction({ order_id: order.id, ...payload })
        : await createSupplierOrder(payload);

      if (!result.ok) {
        appToast.error(result.error);
        return;
      }

      appToast.success(isEdit ? "Borrador actualizado" : "Pedido creado");
      if (!isEdit && result.orderId) {
        router.push(appRoutes.clothing.orderDetail(result.orderId));
      }
      router.refresh();
    });
  }

  const submitLabel = pending
    ? "Guardando…"
    : isEdit
      ? "Guardar cambios"
      : "Crear borrador";

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <section className="flex flex-col gap-5">
          <h2 className="ropa-section-heading">Datos del pedido</h2>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            <FormInput
              label="Proveedor"
              name="supplier"
              id="supplier"
              className="min-h-11"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Nombre del proveedor"
              required
            />
            <div>
              <FormInput
                label="Temporada"
                name="season"
                id="season"
                className="min-h-11"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Activa: {formatSeasonShort(getCurrentSeason())} (desde 1 sep). Puedes elegir otra
                para pedidos históricos.
              </p>
            </div>
            <div className="sm:col-span-2">
              <FormTextarea
                label="Notas"
                name="notes"
                id="notes"
                className="min-h-[4.5rem] resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opcional"
                rows={2}
              />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-5 border-t border-[var(--club-border)] pt-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="ropa-section-heading">Líneas del pedido</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {lines.length} {lines.length === 1 ? "línea" : "líneas"}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="hidden min-h-11 shrink-0 sm:inline-flex"
              onClick={addLine}
            >
              <Plus className="size-4" aria-hidden />
              Añadir línea
            </Button>
          </div>

          <div className="divide-y divide-[var(--club-border)]">
            {lines.map((line, index) => (
              <div
                key={index}
                className="grid gap-4 py-5 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_auto] sm:items-end sm:gap-3"
              >
                <ProductPicker
                  products={products}
                  value={line.productId}
                  onChange={(productId) => updateLine(index, { productId })}
                  id={`product-${index}`}
                />
                <div className="grid grid-cols-2 gap-3 sm:contents">
                  <SizePicker
                    value={line.size}
                    onChange={(size) => updateLine(index, { size })}
                    id={`size-${index}`}
                  />
                  <FormInput
                    label="Cantidad"
                    name={`qty-${index}`}
                    id={`qty-${index}`}
                    className="min-h-11"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={line.quantityOrdered}
                    onChange={(e) => updateLine(index, { quantityOrdered: e.target.value })}
                    required
                  />
                </div>
                <div className="flex items-end justify-end sm:justify-start">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-11 text-muted-foreground hover:text-destructive"
                    onClick={() => removeLine(index)}
                    disabled={lines.length <= 1}
                    aria-label={`Quitar línea ${index + 1}`}
                  >
                    <Trash2 className="size-4 sm:mr-1.5" aria-hidden />
                    <span className="hidden sm:inline">Quitar</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full sm:hidden"
            onClick={addLine}
          >
            <Plus className="size-4" aria-hidden />
            Añadir línea
          </Button>
        </section>

        {players.length > 0 ? (
          <section
            id="entregas-previstas"
            className="flex scroll-mt-24 flex-col gap-5 border-t border-[var(--club-border)] pt-8"
          >
            <div>
              <h2 className="ropa-section-heading">Entregas previstas</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Opcional. Asigna prendas del pedido a jugadores (con su talla y, si lleva, el
                dorsal). Al entregar, saldrán ya preparadas.
              </p>
            </div>
            <PlannedDeliveriesEditor
              rows={plannedRows}
              onChange={setPlannedRows}
              options={plannedOptions}
              products={products}
              players={players}
            />
          </section>
        ) : null}

        <div className="clothing-toolbar hidden border-t border-[var(--club-border)] pt-6 md:flex">
          <Button type="submit" disabled={pending}>
            {submitLabel}
          </Button>
          {!isEdit ? (
            <Link
              href={appRoutes.clothing.orders}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancelar
            </Link>
          ) : null}
        </div>
      </form>

      <ClothingStickyActionBar
        actions={[
          {
            type: "button",
            label: submitLabel,
            pending,
            onClick: () => handleSubmit(),
          },
        ]}
      />
    </>
  );
}
