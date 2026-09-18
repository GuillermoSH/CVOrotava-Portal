"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { Badge } from "@/components/club/Badge";
import { ConfirmDialog } from "@/components/club/ConfirmDialog";
import { Input } from "@/components/club/Input";
import { SegmentedControl } from "@/components/club/SegmentedControl";
import { ClothingFilterChips } from "@/components/clothing/ClothingFilterChips";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { DashboardPage } from "@/components/layout/DashboardPage";
import { PlayersImportSheet } from "@/components/roster/PlayersImportSheet";
import { PlayersWhatsAppSheet } from "@/components/roster/PlayersWhatsAppSheet";
import {
  bulkUpdatePlayerChecklistAction,
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
import type { PlayerListItem, Team } from "@/lib/types/db";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type ChecklistFilter =
  | "all"
  | "complete"
  | "missing_papers"
  | "missing_docs"
  | "missing_photo"
  | "missing_license"
  | "missing_whatsapp";

type BulkIntent = {
  field: PlayerListToggleField;
  value: boolean;
};

function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function matchesChecklistFilter(player: PlayerListItem, filter: ChecklistFilter): boolean {
  const status = getPlayerOnboardingStatus(player);
  switch (filter) {
    case "all":
      return true;
    case "complete":
      return status.isComplete;
    case "missing_papers":
      return !player.registration_papers_received;
    case "missing_docs":
      return !player.docs_delivered_to_family;
    case "missing_photo":
      return !player.photo_taken;
    case "missing_license":
      return !player.license_completed;
    case "missing_whatsapp":
      return !player.in_whatsapp_group;
    default:
      return true;
  }
}

function docsDateForList(player: PlayerListItem): string | null {
  if (!isDocsDeliveryDateRelevant(player)) return null;
  return formatDocsDeliveredShort(player.docs_delivered_at);
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

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
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
  subtitle,
}: {
  players: PlayerListItem[];
  teams: Team[];
  canWrite: boolean;
  subtitle: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [checklistFilter, setChecklistFilter] = useState<ChecklistFilter>("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");
  const [importOpen, setImportOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkIntent, setBulkIntent] = useState<BulkIntent | null>(null);
  const [bulkMarkMode, setBulkMarkMode] = useState(true);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const searching = query.trim().length > 0;
  const inactiveCount = useMemo(
    () => players.filter((player) => !player.is_active).length,
    [players],
  );
  const showTeamFilter = teams.length > 1;
  const showBajasToggle = inactiveCount > 0;

  const basePool = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players.filter((player) => {
      if (statusFilter === "active" && !player.is_active && !q) return false;
      if (teamFilter !== "all" && player.team_id !== teamFilter) return false;
      if (!q) return true;
      const haystack = [
        formatPlayerName(player),
        player.full_name,
        player.dni ?? "",
        player.team?.name ?? "",
        player.team ? formatTeamCategory(player.team.category) : "",
        player.primary_phone ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [players, query, teamFilter, statusFilter]);

  const visible = useMemo(
    () => basePool.filter((player) => matchesChecklistFilter(player, checklistFilter)),
    [basePool, checklistFilter],
  );

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

  const checklistCounts = useMemo(() => {
    const count = (filter: ChecklistFilter) =>
      basePool.filter((player) => matchesChecklistFilter(player, filter)).length;
    return {
      all: basePool.length,
      complete: count("complete"),
      missing_papers: count("missing_papers"),
      missing_docs: count("missing_docs"),
      missing_photo: count("missing_photo"),
      missing_license: count("missing_license"),
      missing_whatsapp: count("missing_whatsapp"),
    };
  }, [basePool]);

  const teamOptions = [
    {
      value: "all",
      label: "Todos",
      count: players.filter((p) => statusFilter === "all" || p.is_active).length,
    },
    ...teams.map((team) => ({
      value: team.id,
      label: team.name,
      count: players.filter(
        (player) => player.team_id === team.id && (statusFilter === "all" || player.is_active),
      ).length,
    })),
  ];

  const checklistOptions: { value: ChecklistFilter; label: string; count: number }[] = [
    { value: "all", label: "Todos", count: checklistCounts.all },
    { value: "complete", label: "Alta completa", count: checklistCounts.complete },
    { value: "missing_docs", label: "Falta docs", count: checklistCounts.missing_docs },
    { value: "missing_papers", label: "Falta papeles", count: checklistCounts.missing_papers },
    { value: "missing_photo", label: "Falta foto", count: checklistCounts.missing_photo },
    { value: "missing_license", label: "Falta licencia", count: checklistCounts.missing_license },
    { value: "missing_whatsapp", label: "Sin WhatsApp", count: checklistCounts.missing_whatsapp },
  ];

  const allVisibleSelected =
    visible.length > 0 && visible.every((player) => selected.has(player.id));
  const selectedCount = selected.size;
  const hasSelection = selectedCount > 0;

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

  const bulkTitle = bulkIntent
    ? `${bulkIntent.value ? "Marcar" : "Desmarcar"} ${PLAYER_CHECKLIST_LABELS[bulkIntent.field].toLowerCase()} en ${selectedCount} jugador${selectedCount === 1 ? "" : "es"}`
    : "";

  const selectionBar = hasSelection && canWrite ? (
    <div className="sticky top-0 z-20 -mx-1 mb-1 rounded-xl border border-[var(--club-border)] bg-[var(--club-drawer-bg)]/95 px-3 py-2.5 shadow-[0_8px_24px_rgba(16,16,24,0.08)] backdrop-blur-sm max-md:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-2 text-sm font-medium text-foreground tabular-nums">
          {selectedCount} seleccionado{selectedCount === 1 ? "" : "s"}
        </p>
        {PLAYER_LIST_TOGGLE_FIELDS.map((field) => (
          <div key={field} className="flex items-center gap-1">
            <button
              type="button"
              className="btn-secondary min-h-9 px-2.5 text-xs"
              disabled={pending}
              onClick={() => requestBulk(field, true)}
            >
              + {PLAYER_CHECKLIST_LABELS[field]}
            </button>
            <button
              type="button"
              className="btn-secondary min-h-9 px-2 text-xs text-muted-foreground"
              disabled={pending}
              onClick={() => requestBulk(field, false)}
              aria-label={`Desmarcar ${PLAYER_CHECKLIST_LONG_LABELS[field]}`}
            >
              −
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-secondary min-h-9 px-2.5 text-xs"
          onClick={() => setSelected(new Set())}
        >
          Limpiar
        </button>
      </div>
    </div>
  ) : null;

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
        <div className={showBajasToggle ? "flex flex-col gap-3 md:flex-row md:items-center" : undefined}>
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, DNI, equipo o teléfono"
            aria-label="Buscar jugadores"
            className="min-h-11 md:min-w-0 md:flex-1"
          />
          {showBajasToggle ? (
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 md:min-h-8 md:shrink-0 md:px-1">
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

        {showTeamFilter ? (
          <ClothingFilterChips
            options={teamOptions}
            value={teamFilter}
            onChange={setTeamFilter}
            ariaLabel="Filtrar por equipo"
          />
        ) : null}

        <ClothingFilterChips
          options={checklistOptions}
          value={checklistFilter}
          onChange={setChecklistFilter}
          ariaLabel="Filtrar por checklist de alta"
        />

        {selectionBar}

        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--club-border)] px-6 py-10 text-center">
            <p className="font-medium text-foreground">
              {players.length === 0 ? "Aún no hay jugadores" : "Ningún jugador coincide"}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {players.length === 0
                ? "Da de alta jugadores uno a uno o importa el Excel de la temporada."
                : searching
                  ? "Prueba otro nombre, DNI o equipo."
                  : checklistFilter !== "all"
                    ? "Prueba otro filtro de alta o equipo."
                    : showBajasToggle
                      ? "Prueba otro equipo o marca mostrar bajas."
                      : "Prueba otro equipo."}
            </p>
            {canWrite && players.length === 0 ? (
              <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                <Link href={appRoutes.players.new} className="btn-primary min-h-11">
                  Nuevo jugador
                </Link>
                <button type="button" className="btn-secondary min-h-11" onClick={() => setImportOpen(true)}>
                  Importar Excel
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            {canWrite ? (
              <div className="flex items-center justify-between gap-3">
                <label className="flex min-h-9 cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-[var(--club-border)] accent-brand"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    aria-label="Seleccionar visibles"
                  />
                  <span className="text-sm font-medium text-foreground">
                    Seleccionar visibles
                    <span className="ml-1.5 tabular-nums text-muted-foreground">({visible.length})</span>
                  </span>
                </label>
              </div>
            ) : null}

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
                    <th>Jugador</th>
                    <th className="w-[9.5rem]">Teléfono</th>
                    <th>Alta</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((player) => (
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
              {visible.map((player) => (
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
              <div className="clothing-sticky-bar__inner">
                <p className="text-center text-sm font-medium text-foreground tabular-nums">
                  {selectedCount} seleccionado{selectedCount === 1 ? "" : "s"}
                </p>
                <div className="flex justify-center">
                  <SegmentedControl
                    aria-label="Acción en lote"
                    value={bulkMarkMode ? "mark" : "unmark"}
                    onChange={(value) => setBulkMarkMode(value === "mark")}
                    options={[
                      { value: "mark", label: "Marcar" },
                      { value: "unmark", label: "Desmarcar" },
                    ]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                <button
                  type="button"
                  className="btn-secondary min-h-10 text-xs"
                  onClick={() => setSelected(new Set())}
                >
                  Limpiar selección
                </button>
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

      {canWrite ? <PlayersImportSheet open={importOpen} onClose={() => setImportOpen(false)} /> : null}
      <PlayersWhatsAppSheet
        open={whatsappOpen}
        onClose={() => setWhatsappOpen(false)}
        players={players}
        teams={teams}
      />
    </DashboardPage>
  );
}
