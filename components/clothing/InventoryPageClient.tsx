"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { ClothingFilterChips } from "@/components/clothing/ClothingFilterChips";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { InventoryAssignDialog } from "@/components/clothing/InventoryAssignDialog";
import { InventoryAssignJerseysSheet } from "@/components/clothing/InventoryAssignJerseysSheet";
import { InventoryBoxBoard } from "@/components/clothing/InventoryBoxBoard";
import { InventoryBoxWriteOffSheet } from "@/components/clothing/InventoryBoxWriteOffSheet";
import { Button } from "@/components/club/Button";
import { Input } from "@/components/club/Input";
import { FormSelect } from "@/components/club/forms";
import { INVENTORY_STATUS_LABELS } from "@/lib/clothing/constants";
import { competitionNeedsJersey, lotMatchesQuery } from "@/lib/clothing/formatJersey";
import { flattenBoxNodes } from "@/lib/clothing/storageBoxes";
import { buildStockPools, poolsInLocation } from "@/lib/clothing/stockSources";
import { appRoutes } from "@/lib/constants";
import { formatSeasonShort, getCurrentSeason, getSeasonSelectOptions } from "@/lib/season";
import type {
  ClothingInventoryLotWithDetails,
  ClothingInventoryStatus,
  ClothingStorageLocationNode,
} from "@/lib/types/db";

function InventoryEmptyState({
  statusFilter,
  searching,
  onResetFilter,
  onAddStock,
}: {
  statusFilter: ClothingInventoryStatus | "all";
  searching: boolean;
  onResetFilter: () => void;
  onAddStock: () => void;
}) {
  const isFiltered = statusFilter !== "all" || searching;

  return (
    <div className="ropa-empty">
      <p className="ropa-empty__title">
        {searching
          ? "Ningún lote coincide"
          : isFiltered
            ? "Ningún lote con este filtro"
            : "Inventario vacío"}
      </p>
      <p className="ropa-empty__body">
        {searching
          ? "Prueba otro nombre, talla o dorsal."
          : isFiltered
            ? "Prueba otro estado o muestra todos los lotes."
            : "Añade stock y colócalo en cajas para ver el almacén."}
      </p>
      {isFiltered ? (
        <button type="button" onClick={onResetFilter} className="btn-secondary mt-5 min-h-11 md:min-h-8">
          Ver todos
        </button>
      ) : (
        <Button type="button" variant="primary" className="mt-5 min-h-11 md:min-h-8" onClick={onAddStock}>
          <Plus className="size-4" aria-hidden />
          Añadir stock
        </Button>
      )}
    </div>
  );
}

export function InventoryPageClient({
  lots,
  storageTree,
  onManualOpenChange,
  initialQuery = "",
  initialStatus = "all",
  initialMissingJersey = false,
  sourceOrderId = null,
  sourceOrderLabel = null,
}: {
  lots: ClothingInventoryLotWithDetails[];
  storageTree: ClothingStorageLocationNode[];
  onManualOpenChange: (open: boolean) => void;
  initialQuery?: string;
  initialStatus?: ClothingInventoryStatus | "all";
  initialMissingJersey?: boolean;
  sourceOrderId?: string | null;
  sourceOrderLabel?: string | null;
}) {
  const [statusFilter, setStatusFilter] = useState<ClothingInventoryStatus | "all">(initialStatus);
  const [seasonFilter, setSeasonFilter] = useState<string>("all");
  const [missingJerseyOnly, setMissingJerseyOnly] = useState(initialMissingJersey);
  const [orderFilter, setOrderFilter] = useState<string | null>(sourceOrderId);
  const [query, setQuery] = useState(initialQuery);
  const [assignLot, setAssignLot] = useState<ClothingInventoryLotWithDetails | null>(null);
  const [jerseyLot, setJerseyLot] = useState<ClothingInventoryLotWithDetails | null>(null);
  const [writeOff, setWriteOff] = useState<{
    storageLocationId: string | null;
    locationLabel: string;
  } | null>(null);

  const seasonOptions = useMemo(() => {
    const seasons = lots.map((lot) => lot.product.season);
    const options = getSeasonSelectOptions(seasons, { pastCount: 4, futureCount: 0 });
    return [
      { value: "all", label: "Todas las temporadas" },
      { value: getCurrentSeason(), label: `Actual (${formatSeasonShort(getCurrentSeason())})` },
      ...options
        .filter((opt) => opt.value !== getCurrentSeason())
        .map((opt) => ({ value: opt.value, label: opt.label })),
    ];
  }, [lots]);

  const searching =
    query.trim().length > 0 ||
    missingJerseyOnly ||
    seasonFilter !== "all" ||
    orderFilter != null;

  const visibleLots = useMemo(
    () =>
      lots.filter((lot) => {
        if (orderFilter && lot.source_order_id !== orderFilter) return false;
        if (seasonFilter !== "all" && lot.product.season !== seasonFilter) return false;
        if (missingJerseyOnly && !competitionNeedsJersey(lot.product, lot.jersey_number)) {
          return false;
        }
        return lotMatchesQuery(lot, query);
      }),
    [lots, query, seasonFilter, missingJerseyOnly, orderFilter],
  );

  const pendingCount = visibleLots.filter((lot) => lot.status === "pending_storage").length;
  const storedCount = visibleLots.filter((lot) => lot.status === "stored").length;
  const pools = buildStockPools(lots, storageTree);

  const filterOptions = [
    { value: "all" as const, label: "Todos", count: visibleLots.length },
    {
      value: "pending_storage" as const,
      label: INVENTORY_STATUS_LABELS.pending_storage,
      count: pendingCount,
    },
    {
      value: "stored" as const,
      label: INVENTORY_STATUS_LABELS.stored,
      count: storedCount,
    },
  ];

  const showBoxes = statusFilter !== "pending_storage";
  const boxCount = flattenBoxNodes(storageTree).length;
  const filteredEmpty =
    (statusFilter === "pending_storage" && pendingCount === 0) ||
    (statusFilter === "stored" && storedCount === 0) ||
    (statusFilter === "all" && visibleLots.length === 0 && (searching || boxCount === 0));

  const writeOffPools = writeOff
    ? poolsInLocation(pools, writeOff.storageLocationId)
    : [];

  return (
    <>
      <div className="clothing-page-with-sticky flex flex-col gap-4">
        {orderFilter && sourceOrderLabel ? (
          <div className="ropa-set-band ropa-set-band--lit !py-3">
            <div className="ropa-set-band__main">
              <p className="ropa-set-band__label">Filtro</p>
              <p className="ropa-set-band__title text-base">
                Pedido {sourceOrderLabel}
                {statusFilter === "pending_storage" ? " · ubicar" : ""}
                {missingJerseyOnly ? " · sin dorsal" : ""}
              </p>
              <button
                type="button"
                className="ropa-set-band__cta"
                onClick={() => {
                  setOrderFilter(null);
                  setStatusFilter("all");
                  setMissingJerseyOnly(false);
                }}
              >
                Quitar filtro
              </button>
            </div>
          </div>
        ) : null}

        <div className="ropa-search">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar prenda, talla o #dorsal"
            aria-label="Buscar en inventario"
            className="min-h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormSelect
            label="Temporada"
            name="inventory-season"
            id="inventory-season"
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value)}
            options={seasonOptions}
          />
          <label className="flex min-h-11 cursor-pointer items-end gap-2.5 pb-2 sm:items-center sm:pb-0 sm:pt-6">
            <input
              type="checkbox"
              className="size-4 rounded border-[var(--club-border)] accent-brand"
              checked={missingJerseyOnly}
              onChange={(e) => setMissingJerseyOnly(e.target.checked)}
            />
            <span className="text-sm font-medium text-foreground">
              Solo competición sin dorsal
            </span>
          </label>
        </div>

        <ClothingFilterChips
          options={filterOptions}
          value={statusFilter}
          onChange={setStatusFilter}
          ariaLabel="Filtrar inventario por estado"
        />

        {pendingCount > 0 && statusFilter !== "stored" ? (
          <p className="text-sm text-muted-foreground">
            {pendingCount === 1
              ? "1 lote pendiente de ubicar"
              : `${pendingCount} lotes pendientes de ubicar`}
            {orderFilter ? " de este pedido" : ""}. Numera dorsales de competición antes de
            colocar en caja si aplica.
          </p>
        ) : null}

        {filteredEmpty ? (
          <InventoryEmptyState
            statusFilter={statusFilter}
            searching={searching}
            onResetFilter={() => {
              setStatusFilter("all");
              setSeasonFilter("all");
              setMissingJerseyOnly(false);
              setOrderFilter(null);
              setQuery("");
            }}
            onAddStock={() => onManualOpenChange(true)}
          />
        ) : (
          <InventoryBoxBoard
            lots={visibleLots}
            storageTree={storageTree}
            showPending={
              statusFilter === "pending_storage" || (statusFilter === "all" && pendingCount > 0)
            }
            showBoxes={showBoxes}
            hideEmptyBoxes={searching}
            onAssign={setAssignLot}
            onAssignJerseys={setJerseyLot}
            onWriteOff={(storageLocationId, locationLabel) =>
              setWriteOff({ storageLocationId, locationLabel })
            }
          />
        )}
      </div>

      <ClothingStickyActionBar
        actions={[
          {
            type: "link",
            label: "Registrar entrega",
            href: appRoutes.clothing.deliveries,
            variant: "secondary",
          },
          {
            type: "button",
            label: "Añadir stock",
            onClick: () => onManualOpenChange(true),
          },
        ]}
      />

      {assignLot ? (
        <InventoryAssignDialog
          lot={assignLot}
          storageTree={storageTree}
          onClose={() => setAssignLot(null)}
        />
      ) : null}

      {jerseyLot ? (
        <InventoryAssignJerseysSheet lot={jerseyLot} onClose={() => setJerseyLot(null)} />
      ) : null}

      {writeOff ? (
        <InventoryBoxWriteOffSheet
          storageLocationId={writeOff.storageLocationId}
          locationLabel={writeOff.locationLabel}
          pools={writeOffPools}
          onClose={() => setWriteOff(null)}
        />
      ) : null}
    </>
  );
}
