"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import {
  ClothingBottomSheet,
  ClothingSheetOption,
} from "@/components/clothing/ClothingBottomSheet";
import { Select } from "@/components/club/Select";
import { Label } from "@/components/club/Label";
import { PRODUCT_CATEGORY_LABELS } from "@/lib/clothing/constants";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import { cn } from "@/lib/utils";
import type { ClothingProduct } from "@/lib/types/db";

export function ProductPicker({
  products,
  value,
  onChange,
  id = "product",
}: {
  products: ClothingProduct[];
  value: string;
  onChange: (productId: string) => void;
  id?: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const selected = products.find((product) => product.id === value);

  const labelText = selected
    ? `${formatProductShort(selected)} (${PRODUCT_CATEGORY_LABELS[selected.category]})`
    : "Selecciona prenda…";

  const selectOptions = useMemo(
    () =>
      products.map((product) => ({
        value: product.id,
        label: `${formatProductShort(product)} (${PRODUCT_CATEGORY_LABELS[product.category]})`,
      })),
    [products],
  );

  function select(productId: string) {
    onChange(productId);
    setSheetOpen(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label id={`${id}-label`}>Prenda</Label>

      <button
        type="button"
        aria-labelledby={`${id}-label`}
        onClick={() => setSheetOpen(true)}
        className={cn(
          "form-input flex min-h-11 items-center justify-between gap-2 text-left md:hidden",
          !selected && "text-muted-foreground",
        )}
      >
        <span className="truncate">{labelText}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      <div className="hidden md:block">
        <Select
          id={id}
          aria-label="Prenda"
          value={value}
          onChange={onChange}
          options={selectOptions}
          placeholder="Selecciona prenda…"
        />
      </div>

      <ClothingBottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Seleccionar prenda"
        secondaryAction={{
          label: "Cerrar",
          onClick: () => setSheetOpen(false),
        }}
      >
        <div className="flex max-h-[50dvh] flex-col gap-2 overflow-y-auto">
          {products.map((product) => (
            <ClothingSheetOption
              key={product.id}
              selected={value === product.id}
              onSelect={() => select(product.id)}
            >
              <span className="font-medium">{formatProductShort(product)}</span>
              <span className="text-muted-foreground">
                {" "}
                ({PRODUCT_CATEGORY_LABELS[product.category]})
              </span>
            </ClothingSheetOption>
          ))}
        </div>
      </ClothingBottomSheet>
    </div>
  );
}
