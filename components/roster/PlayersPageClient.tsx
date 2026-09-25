"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { Badge } from "@/components/club/Badge";
import { ConfirmDialog } from "@/components/club/ConfirmDialog";
import { FacetSearchBar, type FacetField } from "@/components/club/FacetSearchBar";
import { Pagination } from "@/components/club/Pagination";
import { SegmentedControl } from "@/components/club/SegmentedControl";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { DashboardPage } from "@/components/layout/DashboardPage";
import { PlayersFederationImportSheet } from "@/components/roster/PlayersFederationImportSheet";
import { PlayersImportSheet } from "@/components/roster/PlayersImportSheet";
import { PlayersWhatsAppSheet } from "@/components/roster/PlayersWhatsAppSheet";
import {
  bulkSetPlayersActiveAction,
  bulkUpdatePlayerChecklistAction,
  deletePlayersAction,
  updatePlayerChecklistFieldAction,
} from "@/lib/actions/roster/players";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { appRoutes } from "@/lib/constants";
import { formatPlayerName, formatTeamCategory } from "@/lib/roster/constants";
import {
  formatDocsDeliveredShort,
  getPlayerOnboardingStatus,
  isDocsDeliveryDateRelevant,
  PLAYER_CHECKLIST_LABELS,
  PLAYER_CHECKLIST_LONG_LABELS,
  PLAYER_LIST_TOGGLE_FIELDS,
  type PlayerListToggleField,
} from "@/lib/roster/onboarding";
import {
  applyPlayerFacets,
  applyPlayerFacetsExceptChecklist,
  buildCategoryOptions,
  buildChecklistOptions,
  buildGenderOptions,
  buildTeamOptions,
  buildUnassignedOption,
  formatFacetChipLabel,
  reconcileTeamFacet,
  removePlayerFacet,
  sortPlayersByFirstName,
  teamsMatchingFacets,
  upsertPlayerFacet,
  type PlayerFacet,
  type PlayerFacetKey,
  type PlayerSortDir,
} from "@/lib/roster/player-filters";
import { isPlayerProfileIncomplete } from "@/lib/roster/profile-completeness";
import type { PlayerListItem, Team } from "@/lib/types/db";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type BulkIntent = {
  field: PlayerListToggleField;
  value: boolean;
};

type BulkActiveIntent = {
  is_active: boolean;
};

const PAGE_SIZE_OPTIONS = [
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: 0, label: "Todos" },
] as const;

type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]["value"];

function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function FichaIncompletaMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full bg-[var(--club-warning-muted)] px-2 text-[11px] font-semibold leading-none text-[var(--club-warning-strong)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--club-warning)_40%,transparent)]",
        className,
      )}
      title="Falta domicilio, contacto u otros datos de la ficha web"
    >
      Ficha incompleta
    </span>
  );
}

function docsDateForList(player: PlayerListItem): string | null {
  if (!isDocsDeliveryDateRelevant(player)) return null;
  return formatDocsDeliveredShort(player.docs_delivered_at);
}

function SortableNameHeader({
  sortDir,
  onToggle,
}: {
  sortDir: PlayerSortDir;
  onToggle: () => void;
}) {
  const Icon = sortDir === "asc" ? ArrowUp : ArrowDown;
  const nextHint = sortDir === "asc" ? "descendente" : "ascendente";

  return (
    <th aria-sort={sortDir === "asc" ? "ascending" : "descending"}>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex max-w-full items-center gap-1 rounded-md text-left font-semibold text-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Ordenar por nombre, ${nextHint}`}
      >
        <span className="truncate">Jugador</span>
        <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden strokeWidth={2} />
      </button>
    </th>
  );
}

function AltaCompletaMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full bg-success/15 px-2 text-[11px] font-semibold leading-none text-success",
        className,
      )}
      title="Docs, papeles, foto y licencia listos. Si hay que cambiar algo, ábrelo en la ficha."
    >
      Alta completa
    </span>
  );
}

function ChecklistToggleChip({
  field,
  checked,
  docsDate,
  disabled,
  pending,
  onToggle,
}: {
  field: PlayerListToggleField;
  checked: boolean;
  docsDate?: string | null;
  disabled?: boolean;
  pending?: boolean;
  onToggle: () => void;
}) {
  const label =
    field === "docs_delivered_to_family" && checked && docsDate
      ? `Docs · ${docsDate}`
      : PLAYER_CHECKLIST_LABELS[field];

  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "inline-flex min-h-7 items-center rounded-full px-2 text-[11px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked
          ? "bg-success/15 text-success"
          : "bg-[var(--club-surface-2)] text-muted-foreground ring-1 ring-inset ring-[var(--club-border)]",
        (disabled || pending) && "opacity-60",
      )}
      aria-pressed={checked}
      aria-label={`${PLAYER_CHECKLIST_LONG_LABELS[field]}: ${checked ? "sí" : "no"}`}
    >
      {label}
    </button>
  );
}

function ChecklistReadChip({
  field,
  checked,
  docsDate,
}: {
  field: PlayerListToggleField;
  checked: boolean;
  docsDate?: string | null;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full px-2 text-[11px] font-semibold leading-none",
        checked
          ? "bg-success/15 text-success"
          : "bg-[var(--club-surface-2)] text-muted-foreground ring-1 ring-inset ring-[var(--club-border)]",
      )}
    >
      {field === "docs_delivered_to_family" && checked && docsDate
        ? `Docs · ${docsDate}`
        : PLAYER_CHECKLIST_LABELS[field]}
    </span>
  );
}

function PlayerChecklistTags({
  player,
  canWrite,
  pending,
  togglingKey,
  onToggle,
  className,
}: {
  player: PlayerListItem;
  canWrite: boolean;
  pending: boolean;
  togglingKey: string | null;
  onToggle: (field: PlayerListToggleField) => void;
  className?: string;
}) {
  const status = getPlayerOnboardingStatus(player);
  const docsDate = docsDateForList(player);
  const fields: PlayerListToggleField[] = status.isComplete
    ? ["in_whatsapp_group"]
    : [...PLAYER_LIST_TOGGLE_FIELDS];

  const profileIncomplete = isPlayerProfileIncomplete(player);

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {profileIncomplete ? <FichaIncompletaMark /> : null}
      {status.isComplete ? <AltaCompletaMark /> : null}
      {fields.map((field) =>
        canWrite ? (
          <ChecklistToggleChip
            key={field}
            field={field}
            checked={player[field]}
            docsDate={docsDate}
            pending={pending && togglingKey === `${player.id}:${field}`}
            onToggle={() => onToggle(field)}
          />
        ) : (
          <ChecklistReadChip key={field} field={field} checked={player[field]} docsDate={docsDate} />
        ),
      )}
    </div>
  );
}

export function PlayersPageClient({
  players,
  teams,
  canWrite,
  canDelete = false,
  subtitle,
}: {
  players: PlayerListItem[];
  teams: Team[];
  canWrite: boolean;
  /** Hard delete — solo admin. */
  canDelete?: boolean;
  subtitle: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [facets, setFacets] = useState<PlayerFacet[]>([]);
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");
  const [importOpen, setImportOpen] = useState(false);
  const [federationImportOpen, setFederationImportOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkIntent, setBulkIntent] = useState<BulkIntent | null>(null);
  const [bulkActiveIntent, setBulkActiveIntent] = useState<BulkActiveIntent | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkMarkMode, setBulkMarkMode] = useState(true);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(50);
  const [sortDir, setSortDir] = useState<PlayerSortDir>("asc");
  const selectAllRef = useRef<HTMLInputElement>(null);

  const searching = query.trim().length > 0 || facets.length > 0;
  const inactiveCount = useMemo(
    () => players.filter((player) => !player.is_active).length,
    [players],
  );
  const showBajasToggle = inactiveCount > 0;

  const filterState = useMemo(
    () => ({ query, facets, statusFilter }),
    [query, facets, statusFilter],
  );

  const visible = useMemo(
    () => sortPlayersByFirstName(applyPlayerFacets(players, filterState), sortDir),
    [players, filterState, sortDir],
  );

  const pageCount = useMemo(() => {
    if (pageSize === 0 || visible.length === 0) return 1;
    return Math.max(1, Math.ceil(visible.length / pageSize));
  }, [visible.length, pageSize]);

  const safePage = Math.min(page, pageCount);

  const pageItems = useMemo(() => {
    if (pageSize === 0) return visible;
    const start = (safePage - 1) * pageSize;
    return visible.slice(start, start + pageSize);
  }, [visible, pageSize, safePage]);

  const rangeLabel = useMemo(() => {
    if (visible.length === 0) {
      return searching ? "0 visibles" : "0 jugadores";
    }
    if (pageSize === 0 || visible.length <= pageSize) {
      return searching
        ? `${visible.length} ${visible.length === 1 ? "visible" : "visibles"}`
        : `${visible.length} ${visible.length === 1 ? "jugador" : "jugadores"}`;
    }
    const start = (safePage - 1) * pageSize + 1;
    const end = Math.min(safePage * pageSize, visible.length);
    const unit = searching ? "visibles" : "jugadores";
    return `${start}–${end} de ${visible.length} ${unit}`;
  }, [visible.length, pageSize, safePage, searching]);

  useEffect(() => {
    setPage(1);
  }, [query, facets, statusFilter, pageSize, sortDir]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  function toggleSortDir() {
    setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
  }

  const categoryGenderFacets = useMemo(
    () => facets.filter((f) => f.key === "category" || f.key === "gender"),
    [facets],
  );

  const cascadePool = useMemo(
    () =>
      applyPlayerFacets(players, {
        query: "",
        facets: categoryGenderFacets,
        statusFilter,
      }),
    [players, categoryGenderFacets, statusFilter],
  );

  const checklistPool = useMemo(
    () => applyPlayerFacetsExceptChecklist(players, filterState),
    [players, filterState],
  );

  const cascadedTeams = useMemo(
    () => teamsMatchingFacets(teams, facets),
    [teams, facets],
  );

  const facetFields: FacetField[] = useMemo(() => {
    const category = facets.find((f) => f.key === "category");
    const gender = facets.find((f) => f.key === "gender");
    const categoryOptionsPool = applyPlayerFacets(players, {
      query: "",
      facets: gender ? [gender] : [],
      statusFilter,
    });
    const genderOptionsPool = applyPlayerFacets(players, {
      query: "",
      facets: category ? [category] : [],
      statusFilter,
    });
    const unassigned = buildUnassignedOption(cascadePool);

    return [
      {
        key: "category",
        label: "Categoría",
        options: buildCategoryOptions(categoryOptionsPool),
      },
      {
        key: "gender",
        label: "Género",
        options: buildGenderOptions(genderOptionsPool),
      },
      {
        key: "team",
        label: "Equipo",
        options: buildTeamOptions(cascadedTeams, cascadePool),
      },
      {
        key: "checklist",
        label: "Alta",
        options: buildChecklistOptions(checklistPool),
      },
      {
        key: "unassigned",
        label: "Sin equipo",
        options: [unassigned],
        instant: true,
      },
    ];
  }, [players, facets, statusFilter, cascadePool, cascadedTeams, checklistPool]);

  const visibleIds = useMemo(() => visible.map((player) => player.id), [visible]);

  useEffect(() => {
    setSelected((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (visibleIds.includes(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [visibleIds]);

  function handleAddFacet(chip: { key: string; value: string; label: string }) {
    const key = chip.key as PlayerFacetKey;
    setFacets((prev) => {
      const next = upsertPlayerFacet(prev, {
        key,
        value: chip.value,
        label: formatFacetChipLabel(key, chip.value, teams),
      });
      return reconcileTeamFacet(next, teams);
    });
  }

  function handleRemoveFacet(key: string) {
    setFacets((prev) => reconcileTeamFacet(removePlayerFacet(prev, key as PlayerFacetKey), teams));
  }

  function handleClearFilters() {
    setQuery("");
    setFacets([]);
  }

  const allVisibleSelected =
    visible.length > 0 && visible.every((player) => selected.has(player.id));
  const selectedCount = selected.size;
  const hasSelection = selectedCount > 0;
  const selectedActiveCount = useMemo(
    () => players.filter((player) => selected.has(player.id) && player.is_active).length,
    [players, selected],
  );
  const selectedInactiveCount = useMemo(
    () => players.filter((player) => selected.has(player.id) && !player.is_active).length,
    [players, selected],
  );
  const someVisibleSelected = hasSelection && !allVisibleSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        for (const id of visibleIds) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of visibleIds) next.add(id);
      return next;
    });
  }

  function toggleField(player: PlayerListItem, field: PlayerListToggleField) {
    if (!canWrite) return;
    const key = `${player.id}:${field}`;
    const nextValue = !player[field];
    setTogglingKey(key);
    startTransition(async () => {
      const result = await updatePlayerChecklistFieldAction({
        id: player.id,
        field,
        value: nextValue,
      });
      setTogglingKey(null);
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function requestBulk(field: PlayerListToggleField, value: boolean) {
    if (selectedCount === 0) return;
    setBulkIntent({ field, value });
  }

  function confirmBulk() {
    if (!bulkIntent || selectedCount === 0) return;
    const { field, value } = bulkIntent;
    const ids = [...selected];
    startTransition(async () => {
      const result = await bulkUpdatePlayerChecklistAction({
        player_ids: ids,
        field,
        value,
      });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success(
        value
          ? `${PLAYER_CHECKLIST_LONG_LABELS[field]} marcado en ${result.updated ?? ids.length} jugadores`
          : `${PLAYER_CHECKLIST_LONG_LABELS[field]} desmarcado en ${result.updated ?? ids.length} jugadores`,
      );
      setBulkIntent(null);
      setSelected(new Set());
      router.refresh();
    });
  }

  function confirmBulkActive() {
    if (!bulkActiveIntent || selectedCount === 0) return;
    const { is_active } = bulkActiveIntent;
    const ids = players
      .filter((player) => selected.has(player.id) && player.is_active !== is_active)
      .map((player) => player.id);
    if (ids.length === 0) {
      setBulkActiveIntent(null);
      return;
    }
    startTransition(async () => {
      const result = await bulkSetPlayersActiveAction({
        player_ids: ids,
        is_active,
      });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success(
        is_active
          ? `${result.updated ?? ids.length} jugador${(result.updated ?? ids.length) === 1 ? "" : "es"} reactivado${(result.updated ?? ids.length) === 1 ? "" : "s"}`
          : `${result.updated ?? ids.length} jugador${(result.updated ?? ids.length) === 1 ? "" : "es"} dado${(result.updated ?? ids.length) === 1 ? "" : "s"} de baja`,
      );
      setBulkActiveIntent(null);
      setSelected(new Set());
      router.refresh();
    });
  }

  function confirmBulkDelete() {
    if (!canDelete || selectedCount === 0) return;
    const ids = [...selected];
    startTransition(async () => {
      const result = await deletePlayersAction({ player_ids: ids });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success(
        `${result.updated ?? ids.length} jugador${(result.updated ?? ids.length) === 1 ? "" : "es"} eliminado${(result.updated ?? ids.length) === 1 ? "" : "s"}`,
      );
      setBulkDeleteOpen(false);
      setSelected(new Set());
      router.refresh();
    });
  }

  const bulkActiveTitle = bulkActiveIntent
    ? bulkActiveIntent.is_active
      ? `Reactivar ${selectedInactiveCount} jugador${selectedInactiveCount === 1 ? "" : "es"}`
      : `Dar de baja a ${selectedActiveCount} jugador${selectedActiveCount === 1 ? "" : "es"}`
    : "";

  const bulkDeleteTitle = `Eliminar ${selectedCount} jugador${selectedCount === 1 ? "" : "es"}`;

  const bulkTitle = bulkIntent
    ? `${bulkIntent.value ? "Marcar" : "Desmarcar"} ${PLAYER_CHECKLIST_LABELS[bulkIntent.field].toLowerCase()} en ${selectedCount} jugador${selectedCount === 1 ? "" : "es"}`
    : "";

  const bulkFieldButtons = (
    <div className="flex flex-wrap gap-1.5">
      {PLAYER_LIST_TOGGLE_FIELDS.map((field) => (
        <button
          key={field}
          type="button"
          className="btn-secondary min-h-9 px-2.5 text-xs"
          disabled={pending}
          onClick={() => requestBulk(field, bulkMarkMode)}
        >
          {PLAYER_CHECKLIST_LABELS[field]}
        </button>
      ))}
    </div>
  );

  const listPager = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggleSortDir}
        className="inline-flex min-h-9 cursor-pointer touch-manipulation items-center gap-1.5 rounded-lg border border-[var(--club-border)] bg-[var(--club-surface-2)] px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-[var(--club-surface-hover)] md:hidden"
        aria-label={`Orden por nombre ${sortDir === "asc" ? "ascendente" : "descendente"}; pulsa para invertir`}
      >
        Nombre
        {sortDir === "asc" ? (
          <ArrowUp className="size-3.5" aria-hidden strokeWidth={2.25} />
        ) : (
          <ArrowDown className="size-3.5" aria-hidden strokeWidth={2.25} />
        )}
      </button>
      <div
        className="inline-flex items-center rounded-lg border border-[var(--club-border)] bg-[var(--club-surface-2)] p-0.5"
        role="group"
        aria-label="Jugadores por página"
      >
        {PAGE_SIZE_OPTIONS.map((opt) => {
          const active = pageSize === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPageSize(opt.value)}
              className={cn(
                "min-h-9 cursor-pointer touch-manipulation rounded-md px-2.5 text-xs font-semibold tabular-nums transition-colors",
                active
                  ? "bg-[var(--club-drawer-bg)] text-foreground shadow-sm"
                  : "text-[var(--club-fg-muted)] hover:text-foreground",
              )}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <Pagination page={safePage} pageCount={pageCount} onChange={setPage} label="Jugadores" />
    </div>
  );

  return (
    <DashboardPage
      subtitle={subtitle}
      actions={
        canWrite ? (
          <div className="clothing-toolbar hidden md:flex">
            <button type="button" className="btn-secondary" onClick={() => setWhatsappOpen(true)}>
              WhatsApp
            </button>
            <button type="button" className="btn-secondary" onClick={() => setImportOpen(true)}>
              Importar Excel
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setFederationImportOpen(true)}
            >
              Importar federación
            </button>
            <Link href={appRoutes.players.new} className="btn-primary">
              Nuevo jugador
            </Link>
          </div>
        ) : (
          <div className="clothing-toolbar hidden md:flex">
            <button type="button" className="btn-secondary" onClick={() => setWhatsappOpen(true)}>
              WhatsApp
            </button>
          </div>
        )
      }
    >
      <div className={cn("flex flex-col gap-3", hasSelection && canWrite && "max-md:pb-36")}>
        <div className={showBajasToggle ? "flex flex-col gap-3 md:flex-row md:items-start" : undefined}>
          <FacetSearchBar
            query={query}
            onQueryChange={setQuery}
            facets={facets}
            fields={facetFields}
            onAddFacet={handleAddFacet}
            onRemoveFacet={handleRemoveFacet}
            onClear={handleClearFilters}
            placeholder="Buscar nombre, DNI, teléfono… o filtrar"
            className="md:min-w-0 md:flex-1"
          />
          {showBajasToggle ? (
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 md:mt-1 md:min-h-8 md:shrink-0 md:px-1">
              <input
                type="checkbox"
                className="size-4 shrink-0 rounded border-[var(--club-border)] accent-brand"
                checked={statusFilter === "all"}
                onChange={(e) => setStatusFilter(e.target.checked ? "all" : "active")}
              />
              <span className="text-sm font-medium text-foreground">
                Mostrar bajas
                <span className="ml-1.5 tabular-nums text-muted-foreground">({inactiveCount})</span>
              </span>
            </label>
          ) : null}
        </div>

        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--club-border)] px-6 py-10 text-center">
            <p className="font-medium text-foreground">
              {players.length === 0 ? "Aún no hay jugadores" : "Ningún jugador coincide"}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {players.length === 0
                ? "Da de alta jugadores uno a uno o importa el Excel de la temporada."
                : searching
                  ? "Prueba otra búsqueda, quita algún filtro o marca mostrar bajas."
                  : showBajasToggle
                    ? "Marca mostrar bajas o ajusta los filtros."
                    : "Ajusta los filtros de búsqueda."}
            </p>
            {canWrite && players.length === 0 ? (
              <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                <Link href={appRoutes.players.new} className="btn-primary min-h-11">
                  Nuevo jugador
                </Link>
                <button type="button" className="btn-secondary min-h-11" onClick={() => setImportOpen(true)}>
                  Importar Excel
                </button>
                <button
                  type="button"
                  className="btn-secondary min-h-11"
                  onClick={() => setFederationImportOpen(true)}
                >
                  Importar federación
                </button>
              </div>
            ) : searching ? (
              <button type="button" className="btn-secondary mt-5 min-h-11" onClick={handleClearFilters}>
                Limpiar filtros
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div
              className={cn(
                "rounded-xl border px-3 py-2.5 transition-colors",
                hasSelection && canWrite
                  ? "sticky top-0 z-20 border-[color-mix(in_srgb,var(--club-brand)_28%,transparent)] bg-[color-mix(in_srgb,var(--club-brand-soft)_40%,var(--club-drawer-bg))] shadow-[var(--club-shadow-card)] max-md:static max-md:shadow-none"
                  : "border-[var(--club-border)] bg-[var(--club-surface)]/60",
              )}
            >
              <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1">
                  {canWrite && hasSelection ? (
                    <label className="flex cursor-pointer items-center gap-2.5">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        className="size-4 rounded border-[var(--club-border)] accent-brand"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        aria-label="Seleccionar todos los visibles"
                      />
                      <span className="text-sm font-medium text-foreground">
                        <span className="tabular-nums">{selectedCount}</span>
                        {" seleccionado"}
                        {selectedCount === 1 ? "" : "s"}
                      </span>
                    </label>
                  ) : (
                    <p className="text-sm font-medium tabular-nums text-foreground">{rangeLabel}</p>
                  )}
                  {hasSelection && canWrite ? (
                    <button
                      type="button"
                      className="min-h-9 cursor-pointer touch-manipulation rounded-lg px-2 text-xs font-medium text-[var(--club-fg-muted)] transition-colors hover:bg-[var(--club-surface-hover)] hover:text-foreground"
                      onClick={() => setSelected(new Set())}
                    >
                      Quitar selección
                    </button>
                  ) : null}
                </div>

                {listPager}
              </div>

              {hasSelection && canWrite ? (
                <div className="mt-2.5 hidden flex-col gap-2 border-t border-[color-mix(in_srgb,var(--club-brand)_16%,transparent)] pt-2.5 md:flex">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedActiveCount > 0 ? (
                      <button
                        type="button"
                        className="btn-secondary min-h-9 text-xs"
                        disabled={pending}
                        onClick={() => setBulkActiveIntent({ is_active: false })}
                      >
                        Dar de baja ({selectedActiveCount})
                      </button>
                    ) : null}
                    {selectedInactiveCount > 0 ? (
                      <button
                        type="button"
                        className="btn-secondary min-h-9 text-xs"
                        disabled={pending}
                        onClick={() => setBulkActiveIntent({ is_active: true })}
                      >
                        Reactivar ({selectedInactiveCount})
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        className="btn-secondary min-h-9 text-xs text-[var(--club-danger)]"
                        disabled={pending}
                        onClick={() => setBulkDeleteOpen(true)}
                      >
                        Eliminar ({selectedCount})
                      </button>
                    ) : null}
                    <SegmentedControl
                      aria-label="Acción en lote"
                      value={bulkMarkMode ? "mark" : "unmark"}
                      onChange={(value) => setBulkMarkMode(value === "mark")}
                      options={[
                        { value: "mark", label: "Marcar" },
                        { value: "unmark", label: "Desmarcar" },
                      ]}
                    />
                    <span className="text-xs text-[var(--club-fg-muted)]">checklist en la selección</span>
                  </div>
                  {bulkFieldButtons}
                </div>
              ) : null}
            </div>

            {/* Desktop — identity + phone + etiquetas de alta */}
            <div className="club-table-wrap hidden md:block">
              <table className="club-table">
                <thead>
                  <tr>
                    {canWrite ? (
                      <th className="w-10">
                        <span className="sr-only">Seleccionar</span>
                      </th>
                    ) : null}
                    <SortableNameHeader sortDir={sortDir} onToggle={toggleSortDir} />
                    <th className="w-[9.5rem]">Teléfono</th>
                    <th>Alta</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((player) => (
                    <tr key={player.id} className={cn(!player.is_active && "opacity-70")}>
                      {canWrite ? (
                        <td>
                          <input
                            type="checkbox"
                            className="size-4 rounded border-[var(--club-border)] accent-brand"
                            checked={selected.has(player.id)}
                            onChange={() => toggleSelect(player.id)}
                            aria-label={`Seleccionar ${formatPlayerName(player)}`}
                          />
                        </td>
                      ) : null}
                      <td>
                        <Link
                          href={appRoutes.players.detail(player.id)}
                          className="club-table__primary min-w-0 hover:underline"
                        >
                          {formatPlayerName(player)}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {player.team?.name ?? "Sin equipo"}
                          {player.clothing_size ? ` · ${formatClothingSize(player.clothing_size)}` : null}
                          {!player.is_active ? " · Baja" : null}
                        </p>
                      </td>
                      <td>
                        {player.primary_phone ? (
                          <a
                            href={phoneHref(player.primary_phone)}
                            className="text-sm font-medium text-brand tabular-nums hover:underline"
                          >
                            {player.primary_phone}
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td>
                        <PlayerChecklistTags
                          player={player}
                          canWrite={canWrite}
                          pending={pending}
                          togglingKey={togglingKey}
                          onToggle={(field) => toggleField(player, field)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile — card densa: identidad + meta/tel + etiquetas */}
            <ul className="flex flex-col gap-2 md:hidden">
              {pageItems.map((player) => (
                <li
                  key={player.id}
                  className="clothing-list-card !px-3 !py-2.5"
                >
                  <div className="flex gap-2.5">
                    {canWrite ? (
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 rounded border-[var(--club-border)] accent-brand"
                        checked={selected.has(player.id)}
                        onChange={() => toggleSelect(player.id)}
                        aria-label={`Seleccionar ${formatPlayerName(player)}`}
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <Link
                          href={appRoutes.players.detail(player.id)}
                          className="min-w-0 truncate text-sm font-semibold leading-snug tracking-tight text-foreground hover:underline"
                        >
                          {formatPlayerName(player)}
                        </Link>
                        {player.is_active ? null : (
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            Baja
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs leading-snug text-muted-foreground">
                        {player.team?.name ?? "Sin equipo"}
                        {player.clothing_size ? ` · ${formatClothingSize(player.clothing_size)}` : null}
                        {player.primary_phone ? (
                          <>
                            {" · "}
                            <a
                              href={phoneHref(player.primary_phone)}
                              className="font-medium text-brand tabular-nums"
                            >
                              {player.primary_phone}
                            </a>
                          </>
                        ) : null}
                      </p>
                      <PlayerChecklistTags
                        className="mt-2"
                        player={player}
                        canWrite={canWrite}
                        pending={pending}
                        togglingKey={togglingKey}
                        onToggle={(field) => toggleField(player, field)}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {canWrite && hasSelection && typeof document !== "undefined"
        ? createPortal(
            <div className="clothing-sticky-bar md:hidden">
              <div className="clothing-sticky-bar__inner gap-2.5">
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {selectedCount} seleccionado{selectedCount === 1 ? "" : "s"}
                  </p>
                  <button
                    type="button"
                    className="min-h-9 cursor-pointer touch-manipulation rounded-lg px-2 text-xs font-medium text-[var(--club-fg-muted)]"
                    onClick={() => setSelected(new Set())}
                  >
                    Quitar selección
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedActiveCount > 0 ? (
                    <button
                      type="button"
                      className="btn-secondary min-h-11 flex-1 text-xs"
                      disabled={pending}
                      onClick={() => setBulkActiveIntent({ is_active: false })}
                    >
                      Dar de baja ({selectedActiveCount})
                    </button>
                  ) : null}
                  {selectedInactiveCount > 0 ? (
                    <button
                      type="button"
                      className="btn-secondary min-h-11 flex-1 text-xs"
                      disabled={pending}
                      onClick={() => setBulkActiveIntent({ is_active: true })}
                    >
                      Reactivar ({selectedInactiveCount})
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      className="btn-secondary min-h-11 flex-1 text-xs text-[var(--club-danger)]"
                      disabled={pending}
                      onClick={() => setBulkDeleteOpen(true)}
                    >
                      Eliminar ({selectedCount})
                    </button>
                  ) : null}
                </div>
                <SegmentedControl
                  aria-label="Acción en lote"
                  value={bulkMarkMode ? "mark" : "unmark"}
                  onChange={(value) => setBulkMarkMode(value === "mark")}
                  options={[
                    { value: "mark", label: "Marcar" },
                    { value: "unmark", label: "Desmarcar" },
                  ]}
                />
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {PLAYER_LIST_TOGGLE_FIELDS.map((field) => (
                    <button
                      key={field}
                      type="button"
                      className="btn-secondary min-h-11 text-xs"
                      disabled={pending}
                      onClick={() => requestBulk(field, bulkMarkMode)}
                    >
                      {PLAYER_CHECKLIST_LABELS[field]}
                    </button>
                  ))}
                </div>
              </div>
            </div>,
            document.body,
          )
        : (
        <ClothingStickyActionBar
          actions={
            canWrite
              ? [
                  {
                    type: "button",
                    label: "WhatsApp",
                    onClick: () => setWhatsappOpen(true),
                    variant: "secondary",
                  },
                  {
                    type: "button",
                    label: "Importar",
                    onClick: () => setImportOpen(true),
                    variant: "secondary",
                  },
                  {
                    type: "button",
                    label: "Federación",
                    onClick: () => setFederationImportOpen(true),
                    variant: "secondary",
                  },
                  { type: "link", label: "Nuevo jugador", href: appRoutes.players.new },
                ]
              : [
                  {
                    type: "button",
                    label: "WhatsApp",
                    onClick: () => setWhatsappOpen(true),
                    variant: "secondary",
                  },
                ]
          }
        />
      )}

      <ConfirmDialog
        open={bulkIntent !== null}
        onClose={() => {
          if (!pending) setBulkIntent(null);
        }}
        title={bulkTitle}
        description={
          bulkIntent
            ? bulkIntent.value
              ? `Se marcará «${PLAYER_CHECKLIST_LONG_LABELS[bulkIntent.field]}» en los jugadores seleccionados.`
              : `Se desmarcará «${PLAYER_CHECKLIST_LONG_LABELS[bulkIntent.field]}» en los jugadores seleccionados.`
            : undefined
        }
        confirmLabel={bulkIntent?.value ? "Marcar" : "Desmarcar"}
        pending={pending}
        onConfirm={confirmBulk}
      />

      <ConfirmDialog
        open={bulkActiveIntent !== null}
        onClose={() => {
          if (!pending) setBulkActiveIntent(null);
        }}
        title={bulkActiveTitle}
        description={
          bulkActiveIntent
            ? bulkActiveIntent.is_active
              ? "Volverán a aparecer en el listado activo de la temporada."
              : "Quedarán como baja (no se borran). Puedes reactivarlos más tarde con «Mostrar bajas»."
            : undefined
        }
        confirmLabel={bulkActiveIntent?.is_active ? "Reactivar" : "Dar de baja"}
        pending={pending}
        onConfirm={confirmBulkActive}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => {
          if (!pending) setBulkDeleteOpen(false);
        }}
        title={bulkDeleteTitle}
        description="Borrado definitivo: se eliminan ficha, contactos y foto. Los pagos anotados se conservan sin jugador. No se puede deshacer."
        confirmLabel="Eliminar definitivamente"
        destructive
        pending={pending}
        onConfirm={confirmBulkDelete}
      />

      {canWrite ? (
        <>
          <PlayersImportSheet open={importOpen} onClose={() => setImportOpen(false)} />
          <PlayersFederationImportSheet
            open={federationImportOpen}
            onClose={() => setFederationImportOpen(false)}
          />
        </>
      ) : null}
      <PlayersWhatsAppSheet
        open={whatsappOpen}
        onClose={() => setWhatsappOpen(false)}
        players={players}
        teams={teams}
        canWrite={canWrite}
      />
    </DashboardPage>
  );
}
