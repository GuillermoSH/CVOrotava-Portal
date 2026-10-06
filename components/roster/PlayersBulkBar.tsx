"use client";

import { SegmentedControl } from "@/components/club/SegmentedControl";
import {
  PLAYER_CHECKLIST_LABELS,
  PLAYER_LIST_TOGGLE_FIELDS,
  type PlayerListToggleField,
} from "@/lib/roster/onboarding";

type PlayersBulkBarProps = {
  variant: "desktop" | "mobile";
  selectedCount: number;
  selectedActiveCount: number;
  selectedInactiveCount: number;
  pending: boolean;
  canDelete: boolean;
  bulkMarkMode: boolean;
  onBulkMarkModeChange: (mark: boolean) => void;
  onClearSelection: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onMove: () => void;
  onDelete: () => void;
  onRequestBulk: (field: PlayerListToggleField, mark: boolean) => void;
  onMoreActions?: () => void;
};

export function PlayersBulkBar({
  variant,
  selectedCount,
  selectedActiveCount,
  selectedInactiveCount,
  pending,
  canDelete,
  bulkMarkMode,
  onBulkMarkModeChange,
  onClearSelection,
  onDeactivate,
  onReactivate,
  onMove,
  onDelete,
  onRequestBulk,
  onMoreActions,
}: PlayersBulkBarProps) {
  if (variant === "desktop") {
    return (
      <div className="mt-2.5 hidden flex-col gap-2 border-t border-[color-mix(in_srgb,var(--club-brand)_16%,transparent)] pt-2.5 md:flex">
        <div className="flex flex-wrap items-center gap-2">
          {selectedActiveCount > 0 ? (
            <button
              type="button"
              className="btn-secondary min-h-9 text-xs"
              disabled={pending}
              onClick={onDeactivate}
            >
              Dar de baja ({selectedActiveCount})
            </button>
          ) : null}
          {selectedInactiveCount > 0 ? (
            <button
              type="button"
              className="btn-secondary min-h-9 text-xs"
              disabled={pending}
              onClick={onReactivate}
            >
              Reactivar ({selectedInactiveCount})
            </button>
          ) : null}
          <button
            type="button"
            className="btn-secondary min-h-9 text-xs"
            disabled={pending}
            onClick={onMove}
          >
            Mover a equipo
          </button>
          {canDelete ? (
            <button
              type="button"
              className="btn-secondary min-h-9 text-xs text-[var(--club-danger)]"
              disabled={pending}
              onClick={onDelete}
            >
              Eliminar ({selectedCount})
            </button>
          ) : null}
          <SegmentedControl
            aria-label="Acción en lote"
            value={bulkMarkMode ? "mark" : "unmark"}
            onChange={(value) => onBulkMarkModeChange(value === "mark")}
            options={[
              { value: "mark", label: "Marcar" },
              { value: "unmark", label: "Desmarcar" },
            ]}
          />
          <span className="text-xs text-[var(--club-fg-muted)]">checklist en la selección</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PLAYER_LIST_TOGGLE_FIELDS.map((field) => (
            <button
              key={field}
              type="button"
              className="btn-secondary min-h-9 px-2.5 text-xs"
              disabled={pending}
              onClick={() => onRequestBulk(field, bulkMarkMode)}
            >
              {PLAYER_CHECKLIST_LABELS[field]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="clothing-sticky-bar md:hidden">
      <div className="clothing-sticky-bar__inner gap-1.5 !py-2">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {selectedCount} seleccionado{selectedCount === 1 ? "" : "s"}
          </p>
          <button
            type="button"
            className="min-h-8 cursor-pointer touch-manipulation rounded-lg px-2 text-xs font-medium text-[var(--club-fg-muted)]"
            onClick={onClearSelection}
          >
            Quitar selección
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedActiveCount > 0 ? (
            <button
              type="button"
              className="inline-flex min-h-8 cursor-pointer touch-manipulation items-center rounded-full border border-[var(--club-border)] bg-[var(--club-surface-2)] px-2.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-[var(--club-surface-hover)] disabled:opacity-60"
              disabled={pending}
              onClick={onDeactivate}
            >
              Baja
            </button>
          ) : null}
          {selectedInactiveCount > 0 ? (
            <button
              type="button"
              className="inline-flex min-h-8 cursor-pointer touch-manipulation items-center rounded-full border border-[var(--club-border)] bg-[var(--club-surface-2)] px-2.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-[var(--club-surface-hover)] disabled:opacity-60"
              disabled={pending}
              onClick={onReactivate}
            >
              Reactivar
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex min-h-8 cursor-pointer touch-manipulation items-center rounded-full border border-[var(--club-border)] bg-[var(--club-surface-2)] px-2.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-[var(--club-surface-hover)] disabled:opacity-60"
            disabled={pending}
            onClick={onMove}
          >
            Mover
          </button>
          {canDelete ? (
            <button
              type="button"
              className="inline-flex min-h-8 cursor-pointer touch-manipulation items-center rounded-full border border-[color-mix(in_srgb,var(--club-danger)_35%,var(--club-border))] bg-[var(--club-surface-2)] px-2.5 text-[11px] font-semibold text-[var(--club-danger)] transition-colors hover:bg-[var(--club-surface-hover)] disabled:opacity-60"
              disabled={pending}
              onClick={onDelete}
            >
              Eliminar
            </button>
          ) : null}
          {onMoreActions ? (
            <button
              type="button"
              className="ml-auto inline-flex min-h-8 cursor-pointer touch-manipulation items-center rounded-full px-2.5 text-[11px] font-semibold text-brand transition-colors hover:bg-[var(--club-brand-soft)] disabled:opacity-60"
              disabled={pending}
              onClick={onMoreActions}
            >
              Más acciones
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
