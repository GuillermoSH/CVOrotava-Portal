"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Badge } from "@/components/club/Badge";
import { ConfirmDialog } from "@/components/club/ConfirmDialog";
import { FacetSearchBar, type FacetField } from "@/components/club/FacetSearchBar";
import { Pagination } from "@/components/club/Pagination";
import { SegmentedControl } from "@/components/club/SegmentedControl";
import { Select } from "@/components/club/Select";
import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import { DashboardPage } from "@/components/layout/DashboardPage";
import { MobileStickyActionBar } from "@/components/layout/MobileStickyActionBar";
import { PlayersBulkBar } from "@/components/roster/PlayersBulkBar";
import { QuickAddPlayerSheet } from "@/components/roster/QuickAddPlayerSheet";
import { WhatsAppGlyph } from "@/components/shared/WhatsAppGlyph";
import {
  bulkSetPlayersActiveAction,
  bulkSetPlayersTeamAction,
  bulkUpdatePlayerChecklistAction,
  deletePlayersAction,
  updatePlayerChecklistFieldAction,
} from "@/lib/actions/roster/players";
import { listWhatsAppPlayersAction } from "@/lib/actions/roster/whatsapp-players";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { appRoutes } from "@/lib/constants";
import {
  formatPlayerName,
  formatTeamCategory,
  TEAM_CATEGORIES,
  TEAM_GENDER_LABELS,
  TEAM_GENDERS,
  type TeamGender,
} from "@/lib/roster/constants";
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
  CHECKLIST_FILTER_LABELS,
  CHECKLIST_FILTER_ORDER,
  formatFacetChipLabel,
  playerDetailHref,
  playerListSearchEqual,
  PLAYER_LIST_PAGE_SIZES,
  reconcileTeamFacet,
  removePlayerFacet,
  serializePlayerListSearchParams,
  teamsMatchingFacets,
  upsertPlayerFacet,
  type PlayerFacet,
  type PlayerFacetKey,
  type PlayerFilterState,
  type PlayerListPageSize,
  type PlayerListPagingState,
  type PlayerSortDir,
} from "@/lib/roster/player-filters";
import {
  readPlayerListScroll,
  writePlayerListScroll,
  type PlayerListScrollState,
} from "@/lib/roster/player-list-scroll";
import { isPlayerProfileIncomplete } from "@/lib/roster/profile-completeness";
import { getCurrentSeason } from "@/lib/season";
import type { PlayerListItem, Team } from "@/lib/types/db";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const PlayersFederationImportSheet = dynamic(
  () =>
    import("@/components/roster/PlayersFederationImportSheet").then(
      (m) => m.PlayersFederationImportSheet,
    ),
  { ssr: false, loading: () => null },
);

const PlayersImportSheet = dynamic(
  () => import("@/components/roster/PlayersImportSheet").then((m) => m.PlayersImportSheet),
  { ssr: false, loading: () => null },
);

const PlayersExportSheet = dynamic(
  () => import("@/components/roster/PlayersExportSheet").then((m) => m.PlayersExportSheet),
  { ssr: false, loading: () => null },
);

const PlayersWhatsAppSheet = dynamic(
  () => import("@/components/roster/PlayersWhatsAppSheet").then((m) => m.PlayersWhatsAppSheet),
  { ssr: false, loading: () => null },
);

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
] as const satisfies ReadonlyArray<{ value: PlayerListPageSize; label: string }>;

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
  className,
}: {
  field: PlayerListToggleField;
  checked: boolean;
  docsDate?: string | null;
  disabled?: boolean;
  pending?: boolean;
  onToggle: () => void;
  className?: string;
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
        className,
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
  className,
}: {
  field: PlayerListToggleField;
  checked: boolean;
  docsDate?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full px-2 text-[11px] font-semibold leading-none",
        checked
          ? "bg-success/15 text-success"
          : "bg-[var(--club-surface-2)] text-muted-foreground ring-1 ring-inset ring-[var(--club-border)]",
        className,
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
  scrollable = false,
}: {
  player: PlayerListItem;
  canWrite: boolean;
  pending: boolean;
  togglingKey: string | null;
  onToggle: (field: PlayerListToggleField) => void;
  className?: string;
  scrollable?: boolean;
}) {
  const status = getPlayerOnboardingStatus(player);
  const docsDate = docsDateForList(player);
  const fields: PlayerListToggleField[] = status.isComplete
    ? ["in_whatsapp_group"]
    : [...PLAYER_LIST_TOGGLE_FIELDS];

  const profileIncomplete = isPlayerProfileIncomplete(player);
  const chipShrink = scrollable ? "shrink-0" : undefined;

  return (
    <div
      className={cn(
        "flex gap-1",
        scrollable
          ? "-mx-0.5 flex-nowrap overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "flex-wrap",
        className,
      )}
    >
      {profileIncomplete ? <FichaIncompletaMark className={chipShrink} /> : null}
      {status.isComplete ? <AltaCompletaMark className={chipShrink} /> : null}
      {fields.map((field) => {
        // WA se gestiona en el flujo WhatsApp, no con toggle en la lista.
        const readOnly = !canWrite || field === "in_whatsapp_group";
        return readOnly ? (
          <ChecklistReadChip
            key={field}
            field={field}
            checked={player[field]}
            docsDate={docsDate}
            className={chipShrink}
          />
        ) : (
          <ChecklistToggleChip
            key={field}
            field={field}
            checked={player[field]}
            docsDate={docsDate}
            pending={pending && togglingKey === `${player.id}:${field}`}
            onToggle={() => onToggle(field)}
            className={chipShrink}
          />
        );
      })}
    </div>
  );
}

function isPlayerListPageSize(value: number): value is PlayerListPageSize {
  return (PLAYER_LIST_PAGE_SIZES as readonly number[]).includes(value);
}

export function PlayersPageClient({
  players,
  total,
  page,
  pageSize,
  sortDir,
  teams,
  inactiveCount,
  canWrite,
  canDelete = false,
  subtitle,
  initialFilters,
  matriculaPaidPlayerIds: _matriculaPaidPlayerIds = [],
}: {
  players: PlayerListItem[];
  total: number;
  page: number;
  pageSize: number;
  sortDir: PlayerSortDir;
  teams: Team[];
  inactiveCount: number;
  canWrite: boolean;
  /** Hard delete — solo admin. */
  canDelete?: boolean;
  subtitle: string;
  initialFilters?: PlayerFilterState;
  /** SSR filtra «Sin matrícula»; el cliente ya no lo usa en la tabla. */
  matriculaPaidPlayerIds?: string[];
}) {
  void _matriculaPaidPlayerIds;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialFilters?.query ?? "");
  const [facets, setFacets] = useState<PlayerFacet[]>(() => initialFilters?.facets ?? []);
  const [statusFilter, setStatusFilter] = useState<"active" | "all">(
    initialFilters?.statusFilter ?? "active",
  );
  const [pagePlayers, setPagePlayers] = useState(players);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportPreferredScope, setExportPreferredScope] = useState<
    "selected" | "filtered" | "season" | undefined
  >(undefined);
  const [federationImportOpen, setFederationImportOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [whatsappPlayers, setWhatsappPlayers] = useState<PlayerListItem[]>([]);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkIntent, setBulkIntent] = useState<BulkIntent | null>(null);
  const [bulkActiveIntent, setBulkActiveIntent] = useState<BulkActiveIntent | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkMoveTeamId, setBulkMoveTeamId] = useState("");
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [bulkMarkMode, setBulkMarkMode] = useState(true);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [savedScroll] = useState<PlayerListScrollState | null>(() =>
    readPlayerListScroll({
      query: initialFilters?.query ?? "",
      facets: initialFilters?.facets ?? [],
      statusFilter: initialFilters?.statusFilter ?? "active",
    }),
  );
  const selectAllRef = useRef<HTMLInputElement>(null);

  const safePageSize: PlayerListPageSize = isPlayerListPageSize(pageSize) ? pageSize : 50;
  const paging: PlayerListPagingState = useMemo(
    () => ({ page, pageSize: safePageSize, sortDir }),
    [page, safePageSize, sortDir],
  );

  const searching = query.trim().length > 0 || facets.length > 0;
  const showBajasToggle = inactiveCount > 0;
  const noPlayersAtAll = total === 0 && !searching && inactiveCount === 0;

  const filterState = useMemo(
    () => ({ query, facets, statusFilter }),
    [query, facets, statusFilter],
  );

  useEffect(() => {
    setPagePlayers(players);
  }, [players]);

  function replaceListUrl(nextFilters: PlayerFilterState, nextPaging: PlayerListPagingState) {
    const next = serializePlayerListSearchParams(nextFilters, nextPaging).toString();
    const current =
      typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
    if (playerListSearchEqual(next, current)) return;
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  // Filtros → URL (reinicia página). Salta el primer render para no pisar ?page= de la URL.
  const didMountFiltersRef = useRef(false);
  useEffect(() => {
    if (!didMountFiltersRef.current) {
      didMountFiltersRef.current = true;
      return;
    }
    replaceListUrl(filterState, { page: 1, pageSize: safePageSize, sortDir });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar filtros
  }, [filterState]);

  function navigatePage(nextPage: number) {
    replaceListUrl(filterState, { page: nextPage, pageSize: safePageSize, sortDir });
  }

  function navigatePageSize(nextSize: PlayerListPageSize) {
    replaceListUrl(filterState, { page: 1, pageSize: nextSize, sortDir });
  }

  function toggleSortDir() {
    replaceListUrl(filterState, {
      page,
      pageSize: safePageSize,
      sortDir: sortDir === "asc" ? "desc" : "asc",
    });
  }

  const pageCount = safePageSize === 0 ? 1 : Math.ceil(total / safePageSize);
  const safePage = pageCount > 0 ? Math.min(page, pageCount) : 1;

  const rangeLabel = useMemo(() => {
    if (total === 0) {
      return searching ? "0 visibles" : "0 jugadores";
    }
    if (safePageSize === 0 || total <= safePageSize) {
      return searching
        ? `${total} ${total === 1 ? "visible" : "visibles"}`
        : `${total} ${total === 1 ? "jugador" : "jugadores"}`;
    }
    const start = (safePage - 1) * safePageSize + 1;
    const end = Math.min(safePage * safePageSize, total);
    const unit = searching ? "visibles" : "jugadores";
    return `${start}–${end} de ${total} ${unit}`;
  }, [total, safePageSize, safePage, searching]);

  // Restaura el scroll guardado (una sola vez), diferido para ir después del
  // reset a top que hace DashboardMain al terminar la navegación pendiente.
  const scrollRestoredRef = useRef(false);
  useEffect(() => {
    if (scrollRestoredRef.current) return;
    scrollRestoredRef.current = true;
    if (!savedScroll) return;

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById("dashboard-main")?.scrollTo({ top: savedScroll.scrollTop });
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [savedScroll]);

  // Guarda scroll por combinación de filtros, para restaurarlo al volver de la ficha.
  useEffect(() => {
    const node = document.getElementById("dashboard-main");
    if (!node) return;

    let ticking = false;
    function flush() {
      writePlayerListScroll(filterState, { scrollTop: node!.scrollTop });
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        flush();
        ticking = false;
      });
    }

    node.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      node.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, [filterState]);

  useEffect(() => {
    if (!whatsappOpen) return;
    if (whatsappPlayers.length > 0) return;

    let cancelled = false;
    setWhatsappLoading(true);
    void listWhatsAppPlayersAction().then((result) => {
      if (cancelled) return;
      setWhatsappLoading(false);
      if (!result.ok) {
        appToast.error(result.error);
        setWhatsappOpen(false);
        return;
      }
      setWhatsappPlayers(result.players);
    });

    return () => {
      cancelled = true;
    };
  }, [whatsappOpen, whatsappPlayers.length]);

  const cascadedTeams = useMemo(
    () => teamsMatchingFacets(teams, facets),
    [teams, facets],
  );

  const facetFields: FacetField[] = useMemo(() => {
    return [
      {
        key: "category",
        label: "Categoría",
        options: TEAM_CATEGORIES.map((category) => ({
          value: category,
          label: formatTeamCategory(category),
        })),
      },
      {
        key: "gender",
        label: "Género",
        options: TEAM_GENDERS.map((gender) => ({
          value: gender,
          label: TEAM_GENDER_LABELS[gender as TeamGender],
        })),
      },
      {
        key: "team",
        label: "Equipo",
        options: cascadedTeams.map((team) => ({
          value: team.id,
          label: team.name,
        })),
      },
      {
        key: "checklist",
        label: "Alta",
        // "Sin matrícula" depende de payments, con SELECT solo para admin/manager (RLS).
        options: CHECKLIST_FILTER_ORDER.filter(
          (filter) => canWrite || filter !== "missing_matricula",
        ).map((filter) => ({
          value: filter,
          label: CHECKLIST_FILTER_LABELS[filter],
        })),
      },
      {
        key: "unassigned",
        label: "Sin equipo",
        options: [{ value: "true", label: "Sin equipo" }],
        instant: true,
      },
    ];
  }, [cascadedTeams, canWrite]);

  const pageIds = useMemo(() => pagePlayers.map((player) => player.id), [pagePlayers]);

  useEffect(() => {
    setSelected((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (pageIds.includes(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [pageIds]);

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

  const allPageSelected =
    pagePlayers.length > 0 && pagePlayers.every((player) => selected.has(player.id));
  const selectedCount = selected.size;
  const hasSelection = selectedCount > 0;
  const selectedActiveCount = useMemo(
    () => pagePlayers.filter((player) => selected.has(player.id) && player.is_active).length,
    [pagePlayers, selected],
  );
  const selectedInactiveCount = useMemo(
    () => pagePlayers.filter((player) => selected.has(player.id) && !player.is_active).length,
    [pagePlayers, selected],
  );
  const somePageSelected = hasSelection && !allPageSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = somePageSelected;
    }
  }, [somePageSelected]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllPage() {
    setSelected((prev) => {
      if (allPageSelected) {
        const next = new Set(prev);
        for (const id of pageIds) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of pageIds) next.add(id);
      return next;
    });
  }

  function toggleField(player: PlayerListItem, field: PlayerListToggleField) {
    if (!canWrite) return;
    const key = `${player.id}:${field}`;
    const nextValue = !player[field];
    const snapshot = pagePlayers;
    setTogglingKey(key);
    setPagePlayers((list) =>
      list.map((row) => {
        if (row.id !== player.id) return row;
        const next: PlayerListItem = { ...row, [field]: nextValue };
        if (field === "docs_delivered_to_family") {
          next.docs_delivered_at = nextValue ? new Date().toISOString() : null;
        }
        return next;
      }),
    );
    startTransition(async () => {
      const result = await updatePlayerChecklistFieldAction({
        id: player.id,
        field,
        value: nextValue,
      });
      setTogglingKey(null);
      if (!result.ok) {
        setPagePlayers(snapshot);
        appToast.error(result.error);
      }
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
    const snapshot = pagePlayers;
    setPagePlayers((list) =>
      list.map((row) => {
        if (!ids.includes(row.id)) return row;
        const next: PlayerListItem = { ...row, [field]: value };
        if (field === "docs_delivered_to_family") {
          next.docs_delivered_at = value ? new Date().toISOString() : null;
        }
        return next;
      }),
    );
    setBulkIntent(null);
    setSelected(new Set());
    startTransition(async () => {
      const result = await bulkUpdatePlayerChecklistAction({
        player_ids: ids,
        field,
        value,
      });
      if (!result.ok) {
        setPagePlayers(snapshot);
        appToast.error(result.error);
        return;
      }
      appToast.success(
        value
          ? `${PLAYER_CHECKLIST_LONG_LABELS[field]} marcado en ${result.updated ?? ids.length} jugadores`
          : `${PLAYER_CHECKLIST_LONG_LABELS[field]} desmarcado en ${result.updated ?? ids.length} jugadores`,
      );
    });
  }

  function confirmBulkActive() {
    if (!bulkActiveIntent || selectedCount === 0) return;
    const { is_active } = bulkActiveIntent;
    const ids = pagePlayers
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
    });
  }

  function openBulkMove() {
    if (selectedCount === 0) return;
    setBulkMoveTeamId("");
    setBulkMoveOpen(true);
  }

  function confirmBulkMove() {
    if (selectedCount === 0) return;
    const ids = [...selected];
    const teamId = bulkMoveTeamId.trim() ? bulkMoveTeamId : null;
    const teamLabel = teamId
      ? (teams.find((team) => team.id === teamId)?.name ?? "equipo")
      : "Sin equipo";
    startTransition(async () => {
      const result = await bulkSetPlayersTeamAction({
        player_ids: ids,
        team_id: teamId,
      });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success(
        `${result.updated ?? ids.length} jugador${(result.updated ?? ids.length) === 1 ? "" : "es"} movido${(result.updated ?? ids.length) === 1 ? "" : "s"} a ${teamLabel}`,
      );
      setBulkMoveOpen(false);
      setSelected(new Set());
    });
  }

  const teamMoveOptions = useMemo(
    () => [
      { value: "", label: "Sin equipo" },
      ...teams.map((team) => ({
        value: team.id,
        label: `${team.name} · ${formatTeamCategory(team.category)}`,
      })),
    ],
    [teams],
  );

  const bulkActiveTitle = bulkActiveIntent
    ? bulkActiveIntent.is_active
      ? `Reactivar ${selectedInactiveCount} jugador${selectedInactiveCount === 1 ? "" : "es"}`
      : `Dar de baja a ${selectedActiveCount} jugador${selectedActiveCount === 1 ? "" : "es"}`
    : "";

  const bulkDeleteTitle = `Eliminar ${selectedCount} jugador${selectedCount === 1 ? "" : "es"}`;

  const bulkTitle = bulkIntent
    ? `${bulkIntent.value ? "Marcar" : "Desmarcar"} ${PLAYER_CHECKLIST_LABELS[bulkIntent.field].toLowerCase()} en ${selectedCount} jugador${selectedCount === 1 ? "" : "es"}`
    : "";

  const listPager = (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={toggleSortDir}
        className="inline-flex min-h-8 cursor-pointer touch-manipulation items-center gap-1 rounded-md border border-[var(--club-border)] bg-[var(--club-surface-2)] px-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-[var(--club-surface-hover)] md:hidden"
        aria-label={`Orden por nombre ${sortDir === "asc" ? "ascendente" : "descendente"}; pulsa para invertir`}
      >
        Nombre
        {sortDir === "asc" ? (
          <ArrowUp className="size-3" aria-hidden strokeWidth={2.25} />
        ) : (
          <ArrowDown className="size-3" aria-hidden strokeWidth={2.25} />
        )}
      </button>
      <div
        className="inline-flex items-center rounded-md border border-[var(--club-border)] bg-[var(--club-surface-2)] p-0.5"
        role="group"
        aria-label="Jugadores por página"
      >
        {PAGE_SIZE_OPTIONS.map((opt) => {
          const active = safePageSize === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => navigatePageSize(opt.value)}
              className={cn(
                "min-h-8 cursor-pointer touch-manipulation rounded px-2 text-[11px] font-semibold tabular-nums transition-colors",
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
      <Pagination
        page={safePage}
        pageCount={pageCount}
        onChange={navigatePage}
        label="Jugadores"
      />
    </div>
  );

  const detailPaging = paging;

  return (
    <DashboardPage
      subtitle={subtitle}
      actions={
        canWrite ? (
          <div className="clothing-toolbar hidden md:flex">
            <button type="button" className="btn-secondary" onClick={() => setWhatsappOpen(true)}>
              WhatsApp
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setExportPreferredScope(undefined);
                setExportOpen(true);
              }}
            >
              Exportar CSV
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
            <button type="button" className="btn-secondary" onClick={() => setQuickAddOpen(true)}>
              Alta rápida
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
      <div className={cn("flex flex-col gap-3", hasSelection && canWrite && "max-md:pb-28")}>
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

        {total === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--club-border)] px-6 py-10 text-center">
            <p className="font-medium text-foreground">
              {noPlayersAtAll ? "Aún no hay jugadores" : "Ningún jugador coincide"}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {noPlayersAtAll
                ? "Da de alta jugadores uno a uno o importa el Excel de la temporada."
                : searching
                  ? "Prueba otra búsqueda, quita algún filtro o marca mostrar bajas."
                  : showBajasToggle
                    ? "Marca mostrar bajas o ajusta los filtros."
                    : "Ajusta los filtros de búsqueda."}
            </p>
            {canWrite && noPlayersAtAll ? (
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
                "rounded-lg border px-2.5 py-1.5 transition-colors",
                hasSelection && canWrite
                  ? "sticky top-0 z-20 border-[color-mix(in_srgb,var(--club-brand)_28%,transparent)] bg-[color-mix(in_srgb,var(--club-brand-soft)_40%,var(--club-drawer-bg))] shadow-[var(--club-shadow-card)] max-md:static max-md:shadow-none"
                  : "border-[var(--club-border)] bg-[var(--club-surface)]/60",
              )}
            >
              <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1">
                  {canWrite && hasSelection ? (
                    <label className="flex cursor-pointer items-center gap-2.5">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        className="size-4 rounded border-[var(--club-border)] accent-brand"
                        checked={allPageSelected}
                        onChange={toggleSelectAllPage}
                        aria-label="Seleccionar todos en esta página"
                      />
                      <span className="text-sm font-medium text-foreground">
                        <span className="tabular-nums">{selectedCount}</span>
                        {" seleccionado"}
                        {selectedCount === 1 ? "" : "s"}
                      </span>
                    </label>
                  ) : (
                    <p className="text-[13px] font-medium tabular-nums text-foreground">
                      {rangeLabel}
                    </p>
                  )}
                  {hasSelection && canWrite ? (
                    <button
                      type="button"
                      className="min-h-8 cursor-pointer touch-manipulation rounded-lg px-2 text-xs font-medium text-[var(--club-fg-muted)] transition-colors hover:bg-[var(--club-surface-hover)] hover:text-foreground"
                      onClick={() => setSelected(new Set())}
                    >
                      Quitar selección
                    </button>
                  ) : null}
                </div>

                {listPager}
              </div>

              {hasSelection && canWrite ? (
                <PlayersBulkBar
                  variant="desktop"
                  selectedCount={selectedCount}
                  selectedActiveCount={selectedActiveCount}
                  selectedInactiveCount={selectedInactiveCount}
                  pending={pending}
                  canDelete={canDelete}
                  bulkMarkMode={bulkMarkMode}
                  onBulkMarkModeChange={setBulkMarkMode}
                  onClearSelection={() => setSelected(new Set())}
                  onDeactivate={() => setBulkActiveIntent({ is_active: false })}
                  onReactivate={() => setBulkActiveIntent({ is_active: true })}
                  onMove={openBulkMove}
                  onDelete={() => setBulkDeleteOpen(true)}
                  onExport={() => {
                    setExportPreferredScope("selected");
                    setExportOpen(true);
                  }}
                  onRequestBulk={requestBulk}
                />
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
                  {pagePlayers.map((player) => (
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
                          href={playerDetailHref(player.id, filterState, detailPaging)}
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
            <ul className="flex flex-col gap-1.5 md:hidden">
              {pagePlayers.map((player) => {
                const teamName = player.team?.name ?? "Sin equipo";
                const metaParts: string[] = [];
                if (player.clothing_size) metaParts.push(formatClothingSize(player.clothing_size));
                return (
                  <li key={player.id} className="clothing-list-card !px-2.5 !py-2">
                    <div className="flex gap-2">
                      {canWrite ? (
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 shrink-0 rounded border-[var(--club-border)] accent-brand"
                          checked={selected.has(player.id)}
                          onChange={() => toggleSelect(player.id)}
                          aria-label={`Seleccionar ${formatPlayerName(player)}`}
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1.5">
                          <Link
                            href={playerDetailHref(player.id, filterState, detailPaging)}
                            className="min-w-0 truncate text-sm font-semibold leading-tight tracking-tight text-foreground hover:underline"
                          >
                            {formatPlayerName(player)}
                          </Link>
                          <span className="min-w-0 truncate text-[11px] font-medium leading-tight text-muted-foreground">
                            · {teamName}
                          </span>
                          {player.is_active ? null : (
                            <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
                              Baja
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] leading-snug text-[var(--club-fg-muted)]">
                          {player.primary_phone ? (
                            <a
                              href={phoneHref(player.primary_phone)}
                              className="font-medium tabular-nums text-brand"
                            >
                              {player.primary_phone}
                            </a>
                          ) : (
                            <span>—</span>
                          )}
                          {metaParts.length > 0 ? ` · ${metaParts.join(" · ")}` : null}
                        </p>
                        <PlayerChecklistTags
                          className="mt-1.5"
                          scrollable
                          player={player}
                          canWrite={canWrite}
                          pending={pending}
                          togglingKey={togglingKey}
                          onToggle={(field) => toggleField(player, field)}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {canWrite && hasSelection ? (
        <PlayersBulkBar
          variant="mobile"
          selectedCount={selectedCount}
          selectedActiveCount={selectedActiveCount}
          selectedInactiveCount={selectedInactiveCount}
          pending={pending}
          canDelete={canDelete}
          bulkMarkMode={bulkMarkMode}
          onBulkMarkModeChange={setBulkMarkMode}
          onClearSelection={() => setSelected(new Set())}
          onDeactivate={() => setBulkActiveIntent({ is_active: false })}
          onReactivate={() => setBulkActiveIntent({ is_active: true })}
          onMove={openBulkMove}
          onDelete={() => setBulkDeleteOpen(true)}
          onExport={() => {
            setExportPreferredScope("selected");
            setExportOpen(true);
          }}
          onRequestBulk={requestBulk}
          onMoreActions={() => setMoreActionsOpen(true)}
        />
      ) : canWrite ? (
        <MobileStickyActionBar>
          <div className="clothing-sticky-bar__inner clothing-sticky-bar__inner--dense">
            <div className="flex items-stretch gap-1.5">
              <button
                type="button"
                className="inline-flex size-9 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-md border border-[var(--club-border)] bg-[var(--club-surface-2)] text-foreground transition-colors hover:bg-[var(--club-surface-hover)]"
                onClick={() => setWhatsappOpen(true)}
                aria-label="WhatsApp"
              >
                <WhatsAppGlyph className="size-4" />
              </button>
              <button
                type="button"
                className="inline-flex min-h-9 min-w-0 flex-1 cursor-pointer touch-manipulation items-center justify-center rounded-md border border-[var(--club-border)] bg-[var(--club-surface-2)] px-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-[var(--club-surface-hover)]"
                onClick={() => {
                  setExportPreferredScope(undefined);
                  setExportOpen(true);
                }}
              >
                CSV
              </button>
              <button
                type="button"
                className="inline-flex min-h-9 min-w-0 flex-1 cursor-pointer touch-manipulation items-center justify-center rounded-md border border-[var(--club-border)] bg-[var(--club-surface-2)] px-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-[var(--club-surface-hover)]"
                onClick={() => setImportOpen(true)}
              >
                Importar
              </button>
              <button
                type="button"
                className="inline-flex min-h-9 min-w-0 flex-1 cursor-pointer touch-manipulation items-center justify-center rounded-md border border-[var(--club-border)] bg-[var(--club-surface-2)] px-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-[var(--club-surface-hover)]"
                onClick={() => setFederationImportOpen(true)}
              >
                Federación
              </button>
            </div>
            <div className="flex items-stretch gap-1.5">
              <button
                type="button"
                className="btn-secondary min-h-10 flex-1 text-sm"
                onClick={() => setQuickAddOpen(true)}
              >
                Alta rápida
              </button>
              <Link
                href={appRoutes.players.new}
                className="btn-primary min-h-10 flex-[2] text-sm"
              >
                Nuevo jugador
              </Link>
            </div>
          </div>
        </MobileStickyActionBar>
      ) : null}

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

      <ClothingBottomSheet
        open={bulkMoveOpen}
        onClose={() => {
          if (!pending) setBulkMoveOpen(false);
        }}
        title={`Mover ${selectedCount} jugador${selectedCount === 1 ? "" : "es"}`}
        description="Elige el equipo de destino de esta temporada, o déjalos sin equipo."
        primaryAction={{
          label: "Mover",
          onClick: confirmBulkMove,
          disabled: pending || selectedCount === 0,
          pending,
        }}
        secondaryAction={{
          label: "Cancelar",
          onClick: () => {
            if (!pending) setBulkMoveOpen(false);
          },
          disabled: pending,
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Equipo</span>
          <Select
            value={bulkMoveTeamId}
            onChange={setBulkMoveTeamId}
            options={teamMoveOptions}
            placeholder="Sin equipo"
            aria-label="Equipo de destino"
            disabled={pending}
          />
        </label>
      </ClothingBottomSheet>

      <ClothingBottomSheet
        open={moreActionsOpen}
        onClose={() => setMoreActionsOpen(false)}
        title="Más acciones"
        description={`Checklist en ${selectedCount} jugador${selectedCount === 1 ? "" : "es"} seleccionados.`}
      >
        <div className="flex flex-col gap-3">
          <SegmentedControl
            aria-label="Acción en lote"
            value={bulkMarkMode ? "mark" : "unmark"}
            onChange={(value) => setBulkMarkMode(value === "mark")}
            options={[
              { value: "mark", label: "Marcar" },
              { value: "unmark", label: "Desmarcar" },
            ]}
          />
          <div className="flex flex-col gap-1.5">
            {PLAYER_LIST_TOGGLE_FIELDS.map((field) => (
              <button
                key={field}
                type="button"
                className="btn-secondary min-h-11 w-full justify-start text-sm"
                disabled={pending}
                onClick={() => {
                  setMoreActionsOpen(false);
                  requestBulk(field, bulkMarkMode);
                }}
              >
                {PLAYER_CHECKLIST_LABELS[field]}
              </button>
            ))}
          </div>
        </div>
      </ClothingBottomSheet>

      {canWrite ? (
        <>
          <PlayersExportSheet
            open={exportOpen}
            onClose={() => setExportOpen(false)}
            selectedIds={[...selected]}
            filteredCount={total}
            filters={filterState}
            preferredScope={exportPreferredScope}
          />
          <PlayersImportSheet open={importOpen} onClose={() => setImportOpen(false)} />
          <PlayersFederationImportSheet
            open={federationImportOpen}
            onClose={() => setFederationImportOpen(false)}
          />
          <QuickAddPlayerSheet
            open={quickAddOpen}
            onClose={() => setQuickAddOpen(false)}
            teams={teams}
            season={getCurrentSeason()}
          />
        </>
      ) : null}
      <PlayersWhatsAppSheet
        open={whatsappOpen}
        onClose={() => setWhatsappOpen(false)}
        players={whatsappPlayers}
        teams={teams}
        canWrite={canWrite}
        loading={whatsappLoading}
      />
    </DashboardPage>
  );
}
