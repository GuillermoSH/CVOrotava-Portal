"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import { ClothingCategoryFold } from "@/components/clothing/ClothingCategoryFold";
import {
  ClothingBottomSheet,
  ClothingSheetOption,
} from "@/components/clothing/ClothingBottomSheet";
import { ProductColorBadge } from "@/components/clothing/ProductColorBadge";
import { Input } from "@/components/club/Input";
import { Label } from "@/components/club/Label";
import { PRODUCT_CATEGORY_LABELS } from "@/lib/clothing/constants";
import { formatProductName, formatProductShort } from "@/lib/clothing/formatProduct";
import { groupByProductCategory } from "@/lib/clothing/groupByCategory";
import { formatSeasonShort } from "@/lib/season";
import { searchIncludes } from "@/lib/text/search";
import { cn } from "@/lib/utils";
import type { ClothingProduct } from "@/lib/types/db";

function productMatches(product: ClothingProduct, query: string): boolean {
  return searchIncludes(
    [
      formatProductName(product),
      formatProductShort(product),
      product.model,
      product.brand,
      PRODUCT_CATEGORY_LABELS[product.category],
    ].join(" "),
    query,
  );
}

export function ProductPicker({
  products,
  value,
  onChange,
  id = "product",
  showSeason = false,
}: {
  products: ClothingProduct[];
  value: string;
  onChange: (productId: string) => void;
  id?: string;
  /** Muestra la temporada del modelo (p. ej. stock multi-temporada). */
  showSeason?: boolean;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  /** Exclusive accordion: auto follows selection until the user toggles. */
  const [fold, setFold] = useState<
    { mode: "auto" } | { mode: "manual"; open: string | null }
  >({ mode: "auto" });
  const selected = products.find((product) => product.id === value);

  const filteredProducts = useMemo(
    () => products.filter((product) => productMatches(product, query)),
    [products, query],
  );

  const groups = useMemo(
    () => groupByProductCategory(filteredProducts, (product) => product.category),
    [filteredProducts],
  );

  const defaultOpenCategory = groups[0]?.category ?? null;

  const labelText = selected
    ? `${formatProductShort(selected)} (${PRODUCT_CATEGORY_LABELS[selected.category]}${
        showSeason ? ` · ${formatSeasonShort(selected.season)}` : ""
      })`
    : "Selecciona prenda…";

  const hasQuery = query.trim().length > 0;

  function isGroupOpen(category: string) {
    if (hasQuery) return true;
    if (groups.length === 1) return true;
    if (fold.mode === "manual") return fold.open === category;
    if (selected) return selected.category === category;
    return category === defaultOpenCategory;
  }

  function toggleGroup(category: string) {
    if (hasQuery || groups.length === 1) return;
    setFold((prev) => {
      const currentlyOpen =
        prev.mode === "manual"
          ? prev.open
          : (selected?.category ?? defaultOpenCategory);
      return {
        mode: "manual",
        open: currentlyOpen === category ? null : category,
      };
    });
  }

  function select(productId: string) {
    onChange(productId);
    setSheetOpen(false);
    setQuery("");
    setFold({ mode: "auto" });
  }

  function handleSheetClose() {
    setFold({ mode: "auto" });
    setQuery("");
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
          "form-input flex min-h-11 items-center justify-between gap-2 text-left",
          !selected && "text-muted-foreground",
        )}
      >
        <span className="truncate">{labelText}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      <ClothingBottomSheet
        open={sheetOpen}
        onClose={handleSheetClose}
        title="Seleccionar prenda"
        description="Busca o abre el tipo para ver las prendas."
        height="full"
        secondaryAction={{
          label: "Cerrar",
          onClick: handleSheetClose,
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar modelo, marca o tipo…"
            aria-label="Buscar prenda"
            className="min-h-11 shrink-0"
            autoFocus
          />
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ninguna prenda coincide.</p>
          ) : (
            <div className="min-h-0 flex-1 basis-0 overflow-y-auto overscroll-contain">
              <div className="flex flex-col gap-2 pb-2">
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
                        {showSeason ? (
                          <span className="text-xs text-muted-foreground">
                            Temp. {formatSeasonShort(product.season)}
                          </span>
                        ) : null}
                      </span>
                    </ClothingSheetOption>
                  ))}
                </ClothingCategoryFold>
              ))}
              </div>
            </div>
          )}
        </div>
      </ClothingBottomSheet>
    </div>
  );
}
