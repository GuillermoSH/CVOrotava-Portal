"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/club/Button";
import { Input } from "@/components/club/Input";
import { Label } from "@/components/club/Label";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { ProductPicker } from "@/components/clothing/ProductPicker";
import { SizePicker } from "@/components/clothing/SizePicker";
import { createSupplierOrder } from "@/lib/actions/clothing/orders";
import { formatSeasonShort, getCurrentSeason } from "@/lib/season";
import { appRoutes } from "@/lib/constants";
import type { ClothingProduct, ClothingSize } from "@/lib/types/db";

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

export function OrderForm({ products }: { products: ClothingProduct[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [supplierName, setSupplierName] = useState("");
  const [season, setSeason] = useState(getCurrentSeason);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);

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
    startTransition(async () => {
      const result = await createSupplierOrder({
        supplier_name: supplierName,
        season,
        notes: notes || undefined,
        lines: lines.map((line) => ({
          product_id: line.productId,
          size: line.size as ClothingSize,
          quantity_ordered: Number(line.quantityOrdered),
        })),
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Pedido creado");
      router.push(appRoutes.clothing.orderDetail(result.orderId!));
      router.refresh();
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <section className="flex flex-col gap-5">
          <h2 className="section-title">Datos del pedido</h2>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="supplier">Proveedor</Label>
              <Input
                id="supplier"
                className="min-h-11"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Nombre del proveedor"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="season">Temporada</Label>
              <Input
                id="season"
                className="min-h-11"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Activa: {formatSeasonShort(getCurrentSeason())} (desde 1 sep). Puedes elegir otra
                para pedidos históricos.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                className="min-h-11"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-5 border-t border-[var(--club-border)] pt-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="section-title">Líneas del pedido</h2>
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
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`qty-${index}`}>Cantidad</Label>
                    <Input
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

        <div className="hidden items-center gap-3 border-t border-[var(--club-border)] pt-6 md:flex">
          <Button type="submit" className="min-h-11 px-6" disabled={pending}>
            {pending ? "Guardando…" : "Crear borrador"}
          </Button>
          <Link
            href={appRoutes.clothing.orders}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancelar
          </Link>
        </div>
      </form>

      <ClothingStickyActionBar
        actions={[
          {
            type: "button",
            label: pending ? "Guardando…" : "Crear borrador",
            pending,
            onClick: () => handleSubmit(),
          },
        ]}
      />
    </>
  );
}
