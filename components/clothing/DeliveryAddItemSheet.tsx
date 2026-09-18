"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ClothingCategoryFold } from "@/components/clothing/ClothingCategoryFold";
import {
  ClothingBottomSheet,
  ClothingSheetOption,
} from "@/components/clothing/ClothingBottomSheet";
import { ProductColorBadge } from "@/components/clothing/ProductColorBadge";
import { Input } from "@/components/club/Input";
import { FormSelect } from "@/components/club/forms";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { formatJerseyNumber, lotMatchesQuery } from "@/lib/clothing/formatJersey";
import { formatProductName } from "@/lib/clothing/formatProduct";
import { groupByProductCategory } from "@/lib/clothing/groupByCategory";
import { formatPoolSource, stockPoolKey, type StockPool } from "@/lib/clothing/stockSources";
import { formatSeasonShort, getCurrentSeason, getSeasonSelectOptions } from "@/lib/season";

export function DeliveryAddItemSheet({
  open,
  onClose,
  pools,
  remainingOnPool,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  pools: StockPool[];
  remainingOnPool: (pool: StockPool) => number;
  onPick: (pool: StockPool) => void;
}) {
  const [query, setQuery] = useState("");
  const [seasonFilter, setSeasonFilter] = useState<string>("all");
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const seasonOptions = useMemo(() => {
    const seasons = pools.flatMap((pool) =>
      pool.lots.map((lot) => lot.product.season),
    );
    return [
      { value: "all", label: "Todas las temporadas" },
      ...getSeasonSelectOptions(seasons, { pastCount: 4, futureCount: 0 }),
    ];
  }, [pools]);

  const matches = useMemo(() => {
    return pools.filter((pool) => {
      if (remainingOnPool(pool) <= 0) return false;
      if (seasonFilter !== "all") {
        const season = pool.lots[0]?.product.season;
        if (season !== seasonFilter) return false;
      }
      if (!query.trim()) return true;
      return pool.lots.some((lot) => lotMatchesQuery(lot, query));
    });
  }, [pools, query, remainingOnPool, seasonFilter]);

  const groups = useMemo(
    () => groupByProductCategory(matches, (pool) => pool.lots[0]?.product.category),
    [matches],
  );

  const searching = Boolean(query.trim());
  const currentSeason = getCurrentSeason();

  function isGroupOpen(category: string) {
    if (searching || groups.length === 1) return true;
    return openCategories.has(category);
  }

  function toggleGroup(category: string) {
    if (searching || groups.length === 1) return;
    setOpenCategories((prev) => (prev.has(category) ? new Set() : new Set([category])));
  }

  function handleClose() {
    setQuery("");
    setSeasonFilter("all");
    setOpenCategories(new Set());
    onClose();
  }

  return (
    <ClothingBottomSheet
      open={open}
      onClose={handleClose}
      title="Añadir prenda"
      description="Incluye stock de otras temporadas. Filtra si quieres acotar."
      secondaryAction={{
        label: "Listo",
        onClick: handleClose,
      }}
    >
      <div className="flex flex-col gap-3">
        <FormSelect
          label="Temporada del stock"
          name="delivery-add-season"
          id="delivery-add-season"
          value={seasonFilter}
          onChange={(e) => setSeasonFilter(e.target.value)}
          options={seasonOptions}
        />
        <div className="clothing-sheet-search">
          <Search className="clothing-sheet-search__icon" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mochila, camiseta o #12"
            aria-label="Buscar stock disponible"
            className="min-h-11"
          />
        </div>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {query.trim() || seasonFilter !== "all"
              ? "Ninguna prenda coincide."
              : "No queda stock disponible."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map((group) => (
              <ClothingCategoryFold
                key={group.category}
                id={`delivery-type-${group.category}`}
                label={group.label}
                count={group.items.length}
                open={isGroupOpen(group.category)}
                onToggle={() => toggleGroup(group.category)}
              >
                {group.items.map((pool) => {
                  const product = pool.lots[0]?.product;
                  const left = remainingOnPool(pool);
                  const added = left < pool.quantity;
                  const key = stockPoolKey(
                    pool.productId,
                    pool.size,
                    pool.storageLocationId,
                    pool.jerseyNumber,
                  );
                  const season = product?.season;
                  return (
                    <ClothingSheetOption
                      key={key}
                      selected={added}
                      onSelect={() => onPick(pool)}
                      className="clothing-sheet-option--stack"
                    >
                      <span className="clothing-sheet-option__body">
                        <span className="clothing-sheet-option__title">
                          <span>{product ? formatProductName(product) : "Prenda"}</span>
                          {product ? (
                            <ProductColorBadge color={product.color} className="shrink-0" />
                          ) : null}
                        </span>
                        <span className="clothing-sheet-option__meta">
                          <span className="clothing-sheet-option__size">
                            {formatClothingSize(pool.size)}
                          </span>
                          {pool.jerseyNumber != null ? (
                            <span className="clothing-sheet-option__jersey">
                              {formatJerseyNumber(pool.jerseyNumber)}
                            </span>
                          ) : null}
                          {season && season !== currentSeason ? (
                            <span className="clothing-sheet-option__src">
                              {formatSeasonShort(season)}
                            </span>
                          ) : null}
                          <span className="clothing-sheet-option__src">{formatPoolSource(pool)}</span>
                        </span>
                      </span>
                      <span className="clothing-sheet-qty" aria-label={`${left} disponibles`}>
                        {left}
                      </span>
                    </ClothingSheetOption>
                  );
                })}
              </ClothingCategoryFold>
            ))}
          </div>
        )}
      </div>
    </ClothingBottomSheet>
  );
}
