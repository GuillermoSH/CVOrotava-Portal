"use client";

import { Download } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import { SegmentedControl } from "@/components/club/SegmentedControl";
import { exportPlayersCsvAction } from "@/lib/actions/roster/export";
import {
  DEFAULT_PLAYER_EXPORT_FIELD_IDS,
  PLAYER_EXPORT_FIELDS,
  PLAYER_EXPORT_GROUP_LABELS,
  PLAYER_EXPORT_FIELD_IDS,
  type PlayerExportFieldGroup,
  type PlayerExportFieldId,
  type PlayerExportScope,
} from "@/lib/roster/player-export";
import type { PlayerFilterState } from "@/lib/roster/player-filters";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const GROUP_ORDER: PlayerExportFieldGroup[] = [
  "identity",
  "club",
  "address",
  "contact",
  "checklist",
  "other",
];

function downloadCsvBase64(filename: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const blob = new Blob([bytes], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function PlayersExportSheet({
  open,
  onClose,
  selectedIds,
  filteredCount,
  filters,
  preferredScope,
}: {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  filteredCount: number;
  filters: PlayerFilterState;
  preferredScope?: PlayerExportScope;
}) {
  const [pending, startTransition] = useTransition();
  const [scope, setScope] = useState<PlayerExportScope>("filtered");
  const [selectedFields, setSelectedFields] = useState<Set<PlayerExportFieldId>>(
    () => new Set(DEFAULT_PLAYER_EXPORT_FIELD_IDS),
  );

  const selectedCount = selectedIds.length;
  const hasSelection = selectedCount > 0;

  useEffect(() => {
    if (!open) return;
    if (preferredScope === "selected" && hasSelection) {
      setScope("selected");
    } else if (preferredScope === "season") {
      setScope("season");
    } else if (hasSelection) {
      setScope("selected");
    } else {
      setScope("filtered");
    }
  }, [open, preferredScope, hasSelection]);

  useEffect(() => {
    if (scope === "selected" && !hasSelection) setScope("filtered");
  }, [scope, hasSelection]);

  const fieldsByGroup = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      label: PLAYER_EXPORT_GROUP_LABELS[group],
      fields: PLAYER_EXPORT_FIELDS.filter((field) => field.group === group),
    })).filter((item) => item.fields.length > 0);
  }, []);

  const selectedFieldCount = selectedFields.size;
  const estimatedCount =
    scope === "selected" ? selectedCount : scope === "filtered" ? filteredCount : null;

  function toggleField(id: PlayerExportFieldId) {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectDefaults() {
    setSelectedFields(new Set(DEFAULT_PLAYER_EXPORT_FIELD_IDS));
  }

  function selectAllFields() {
    setSelectedFields(new Set(PLAYER_EXPORT_FIELD_IDS));
  }

  function handleExport() {
    if (selectedFieldCount === 0) {
      appToast.error("Elige al menos un campo");
      return;
    }
    if (scope === "selected" && selectedCount === 0) {
      appToast.error("Selecciona al menos un jugador");
      return;
    }
    if (scope === "filtered" && filteredCount === 0) {
      appToast.error("Ningún jugador coincide con los filtros");
      return;
    }

    startTransition(async () => {
      const result = await exportPlayersCsvAction({
        scope,
        fieldIds: PLAYER_EXPORT_FIELD_IDS.filter((id) => selectedFields.has(id)),
        playerIds: scope === "selected" ? selectedIds : undefined,
        filters: scope === "filtered" ? filters : undefined,
      });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      downloadCsvBase64(result.filename, result.base64);
      appToast.success(
        result.count === 1 ? "1 jugador exportado" : `${result.count} jugadores exportados`,
      );
      onClose();
    });
  }

  const scopeOptions = [
    ...(hasSelection
      ? [{ value: "selected" as const, label: `Selección (${selectedCount})` }]
      : []),
    { value: "filtered" as const, label: `Lista (${filteredCount})` },
    { value: "season" as const, label: "Temporada" },
  ];

  return (
    <ClothingBottomSheet
      open={open}
      onClose={onClose}
      title="Exportar CSV"
      description="Elige jugadores y columnas. El archivo abre en Excel y en otras apps."
      height="full"
      primaryAction={{
        label: pending
          ? "Exportando…"
          : estimatedCount != null
            ? `Descargar (${estimatedCount})`
            : "Descargar CSV",
        pending,
        disabled: selectedFieldCount === 0 || (scope === "selected" && !hasSelection),
        onClick: handleExport,
      }}
      secondaryAction={{
        label: "Cancelar",
        onClick: onClose,
      }}
    >
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-foreground">Jugadores</p>
          <SegmentedControl
            aria-label="Alcance de la exportación"
            value={scope}
            onChange={(value) => setScope(value as PlayerExportScope)}
            options={scopeOptions}
            fullWidth
          />
          {scope === "season" ? (
            <p className="text-xs text-muted-foreground">
              Incluye altas y bajas de la temporada actual.
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              Campos
              <span className="ml-1.5 font-normal tabular-nums text-muted-foreground">
                ({selectedFieldCount})
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className="min-h-8 cursor-pointer touch-manipulation rounded-lg px-2 text-xs font-medium text-brand hover:bg-[var(--club-brand-soft)]"
                onClick={selectDefaults}
              >
                Básicos
              </button>
              <button
                type="button"
                className="min-h-8 cursor-pointer touch-manipulation rounded-lg px-2 text-xs font-medium text-brand hover:bg-[var(--club-brand-soft)]"
                onClick={selectAllFields}
              >
                Todos
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {fieldsByGroup.map(({ group, label, fields }) => (
              <div key={group} className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {fields.map((field) => {
                    const checked = selectedFields.has(field.id);
                    return (
                      <label
                        key={field.id}
                        className={cn(
                          "flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-1.5 transition-colors",
                          checked
                            ? "border-[color-mix(in_srgb,var(--club-brand)_35%,transparent)] bg-[color-mix(in_srgb,var(--club-brand-soft)_45%,transparent)]"
                            : "border-[var(--club-border)] bg-[var(--club-surface)]/40 hover:bg-[var(--club-surface-hover)]",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="size-4 shrink-0 rounded border-[var(--club-border)] accent-brand"
                          checked={checked}
                          onChange={() => toggleField(field.id)}
                        />
                        <span className="text-sm text-foreground">{field.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Download className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          UTF-8 con BOM para que Excel respete tildes y ñ.
        </p>
      </div>
    </ClothingBottomSheet>
  );
}
