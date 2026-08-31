"use client";

import { useState } from "react";
import { Package, Plus } from "lucide-react";

import { ClothingFilterChips } from "@/components/clothing/ClothingFilterChips";
import { ClothingInventoryCard } from "@/components/clothing/ClothingInventoryCard";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { InventoryAssignDialog } from "@/components/clothing/InventoryAssignDialog";
import { InventoryTable } from "@/components/clothing/InventoryTable";
import { Button } from "@/components/club/Button";
import { INVENTORY_STATUS_LABELS } from "@/lib/clothing/constants";
import type {
  ClothingInventoryLotWithDetails,
  ClothingInventoryStatus,
  ClothingProduct,
  ClothingStorageLocationNode,
} from "@/lib/types/db";

function InventoryEmptyState({
  statusFilter,
  onResetFilter,
  onAddStock,
}: {
  statusFilter: ClothingInventoryStatus | "all";
  onResetFilter: () => void;
  onAddStock: () => void;
}) {
  const isFiltered = statusFilter !== "all";

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--club-border)] px-6 py-10 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-[var(--club-brand-soft)] text-brand">
        <Package className="size-5" aria-hidden />
      </div>
      <p className="mt-4 font-medium text-foreground">
        {isFiltered ? "Ningún lote con este filtro" : "Inventario vacío"}
      </p>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
        {isFiltered
          ? "Prueba otro estado o muestra todos los lotes."
          : "Añade stock manualmente o recibe pedidos para generar lotes en almacén."}
      </p>
      {isFiltered ? (
        <button type="button" onClick={onResetFilter} className="btn-secondary mt-5 min-h-11">
          Ver todos
        </button>
      ) : (
        <Button type="button" variant="primary" className="mt-5 min-h-11" onClick={onAddStock}>
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
}: {
  lots: ClothingInventoryLotWithDetails[];
  storageTree: ClothingStorageLocationNode[];
  onManualOpenChange: (open: boolean) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<ClothingInventoryStatus | "all">("all");
  const [assignLot, setAssignLot] = useState<ClothingInventoryLotWithDetails | null>(null);

  const filtered = lots.filter((lot) =>
    statusFilter === "all" ? true : lot.status === statusFilter,
  );

  const pendingCount = lots.filter((lot) => lot.status === "pending_storage").length;
  const storedCount = lots.filter((lot) => lot.status === "stored").length;

  const filterOptions = [
    { value: "all" as const, label: "Todos", count: lots.length },
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

  return (
    <>
      <div className="clothing-page-with-sticky flex flex-col gap-3">
        <ClothingFilterChips
          options={filterOptions}
          value={statusFilter}
          onChange={setStatusFilter}
          ariaLabel="Filtrar inventario por estado"
        />

        {filtered.length === 0 ? (
          <InventoryEmptyState
            statusFilter={statusFilter}
            onResetFilter={() => setStatusFilter("all")}
            onAddStock={() => onManualOpenChange(true)}
          />
        ) : (
          <>
            <div className="flex flex-col gap-2.5 md:hidden">
              {filtered.map((lot) => (
                <ClothingInventoryCard
                  key={lot.id}
                  lot={lot}
                  onAssign={() => setAssignLot(lot)}
                />
              ))}
            </div>
            <InventoryTable lots={filtered} onAssign={setAssignLot} />
          </>
        )}
      </div>

      <ClothingStickyActionBar
        actions={[
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
    </>
  );
}
