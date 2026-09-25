"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import { ClothingCategoryFold } from "@/components/clothing/ClothingCategoryFold";
import {
  ClothingBottomSheet,
  ClothingSheetOption,
} from "@/components/clothing/ClothingBottomSheet";
import { ProductColorBadge } from "@/components/clothing/ProductColorBadge";
import { Select } from "@/components/club/Select";
import { Label } from "@/components/club/Label";
import { PRODUCT_CATEGORY_LABELS } from "@/lib/clothing/constants";
import { formatProductName, formatProductShort } from "@/lib/clothing/formatProduct";
import { groupByProductCategory } from "@/lib/clothing/groupByCategory";
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
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const selected = products.find((product) => product.id === value);

  const groups = useMemo(
    () => groupByProductCategory(products, (product) => product.category),
    [products],
  );

  const labelText = selected
    ? `${formatProductShort(selected)} (${PRODUCT_CATEGORY_LABELS[selected.category]})`
    : "Selecciona prenda…";

  const selectOptions = useMemo(
    () =>
      groups.map((group) => ({
        label: group.label,
        options: group.items.map((product) => ({
          value: product.id,
          label: formatProductShort(product),
        })),
      })),
    [groups],
  );

  function isGroupOpen(category: string) {
    if (selected?.category === category) return true;
    if (groups.length === 1) return true;
    return openCategories.has(category);
  }

  function toggleGroup(category: string) {
    if (groups.length === 1) return;
    setOpenCategories((prev) => (prev.has(category) ? new Set() : new Set([category])));
  }

  function select(productId: string) {
    onChange(productId);
    setSheetOpen(false);
  }

  function handleSheetClose() {
    setOpenCategories(new Set());
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
        onClose={handleSheetClose}
        title="Seleccionar prenda"
        description="Abre el tipo para ver las prendas."
        secondaryAction={{
          label: "Cerrar",
          onClick: handleSheetClose,
        }}
      >
        <div className="flex flex-col gap-2">
          {groups.map((group) => (
            <ClothingCategoryFold
              key={group.category}
              id={`product-type-${group.category}`}
              label={group.label}
              count={group.items.length}
              open={isGroupOpen(group.category)}
              onToggle={() => toggleGroup(group.category)}
            >
              {group.items.map((product) => (
                <ClothingSheetOption
                  key={product.id}
                  selected={value === product.id}
                  onSelect={() => select(product.id)}
                  className="clothing-sheet-option--stack"
                >
                  <span className="clothing-sheet-option__body">
                    <span className="clothing-sheet-option__title">
                      <span>{formatProductName(product)}</span>
                      <ProductColorBadge color={product.color} className="shrink-0" />
                    </span>
                  </span>
                </ClothingSheetOption>
              ))}
            </ClothingCategoryFold>
          ))}
        </div>
      </ClothingBottomSheet>
    </div>
  );
}
