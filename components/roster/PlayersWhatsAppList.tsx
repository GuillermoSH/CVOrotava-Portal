"use client";

import { Check, Copy, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/club/Button";
import { ConfirmDialog } from "@/components/club/ConfirmDialog";
import { FormSelect } from "@/components/club/forms";
import {
  bulkUpdatePlayerChecklistAction,
  updatePlayerChecklistFieldAction,
} from "@/lib/actions/roster/players";
import {
  formatPlayerName,
  formatTeamCategory,
  TEAM_CATEGORIES,
  TEAM_CATEGORY_LABELS,
  type TeamCategory,
} from "@/lib/roster/constants";
import type { PlayerListItem, Team } from "@/lib/types/db";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export type WhatsAppEntry = {
  playerId: string;
  name: string;
  teamName: string;
  phone: string;
  inGroup: boolean;
};

export function normalizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "").trim();
}

export function buildWhatsAppEntries(
  players: PlayerListItem[],
  {
    category,
    teamId,
    onlyMissingWhatsapp,
  }: {
    category: string;
    teamId: string;
    onlyMissingWhatsapp: boolean;
  },
): WhatsAppEntry[] {
  if (!category) return [];
  const list: WhatsAppEntry[] = [];
  for (const player of players) {
    if (!player.is_active) continue;
    if (player.team?.category !== category) continue;
    if (teamId !== "all" && player.team_id !== teamId) continue;
    if (onlyMissingWhatsapp && player.in_whatsapp_group) continue;
    const phone = player.primary_phone?.trim();
    if (!phone || !normalizePhone(phone)) continue;
    list.push({
      playerId: player.id,
      name: formatPlayerName(player),
      teamName: player.team?.name ?? "Sin equipo",
      phone: phone.trim(),
      inGroup: player.in_whatsapp_group,
    });
  }
  return list.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function useWhatsAppFilters(players: PlayerListItem[], teams: Team[], initialCategory = "") {
  const categoriesInUse = useMemo(() => {
    const present = new Set(
      players
        .filter((player) => player.is_active)
        .map((player) => player.team?.category)
        .filter(Boolean),
    );
    return TEAM_CATEGORIES.filter((category) => present.has(category));
  }, [players]);

  const [category, setCategory] = useState(initialCategory || "");
  const [teamId, setTeamId] = useState("all");
  const [onlyMissingWhatsapp, setOnlyMissingWhatsapp] = useState(true);

  const categoryOptions = useMemo(() => {
    return (categoriesInUse.length ? categoriesInUse : TEAM_CATEGORIES).map((value) => ({
      value,
      label: TEAM_CATEGORY_LABELS[value as TeamCategory] ?? formatTeamCategory(value),
    }));
  }, [categoriesInUse]);

  const teamOptions = useMemo(() => {
    const filtered = teams.filter((team) => !category || team.category === category);
    return [
      { value: "all", label: "Todos los equipos" },
      ...filtered.map((team) => ({
        value: team.id,
        label: team.name,
      })),
    ];
  }, [teams, category]);

  const entries = useMemo(
    () => buildWhatsAppEntries(players, { category, teamId, onlyMissingWhatsapp }),
    [players, category, teamId, onlyMissingWhatsapp],
  );

  return {
    category,
    setCategory: (value: string) => {
      setCategory(value);
      setTeamId("all");
    },
    teamId,
    setTeamId,
    onlyMissingWhatsapp,
    setOnlyMissingWhatsapp,
    categoryOptions,
    teamOptions,
    categoriesInUse,
    entries,
  };
}

export function WhatsAppFilterFields({
  category,
  onCategoryChange,
  teamId,
  onTeamIdChange,
  onlyMissingWhatsapp,
  onOnlyMissingChange,
  categoryOptions,
  teamOptions,
}: {
  category: string;
  onCategoryChange: (value: string) => void;
  teamId: string;
  onTeamIdChange: (value: string) => void;
  onlyMissingWhatsapp: boolean;
  onOnlyMissingChange: (value: boolean) => void;
  categoryOptions: { value: string; label: string }[];
  teamOptions: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <FormSelect
        label="Categoría"
        name="whatsapp-category"
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        options={categoryOptions}
        placeholder="Elige categoría…"
      />
      <FormSelect
        label="Equipo (opcional)"
        name="whatsapp-team"
        value={teamId}
        onChange={(e) => onTeamIdChange(e.target.value)}
        options={teamOptions}
        disabled={!category}
      />
      <label className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-0.5">
        <input
          type="checkbox"
          className="size-4 shrink-0 rounded border-[var(--club-border)] accent-brand"
          checked={onlyMissingWhatsapp}
          onChange={(e) => onOnlyMissingChange(e.target.checked)}
        />
        <span className="text-sm font-medium text-foreground">
          Solo pendientes de grupo
        </span>
      </label>
    </div>
  );
}

export function WhatsAppEntryList({
  entries,
  category,
  canWrite,
  className,
}: {
  entries: WhatsAppEntry[];
  category: string;
  canWrite: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copying, setCopying] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [localDone, setLocalDone] = useState<Set<string>>(() => new Set());

  const queue = useMemo(
    () => entries.filter((entry) => !entry.inGroup && !localDone.has(entry.playerId)),
    [entries, localDone],
  );

  const current = queue[0] ?? null;
  const remaining = queue.length;
  const totalPending = entries.filter((entry) => !entry.inGroup).length + localDone.size;
  const doneCount = localDone.size;
  const progressTotal = Math.max(totalPending, doneCount + remaining);
  const progressPct = progressTotal === 0 ? 0 : Math.round((doneCount / progressTotal) * 100);

  async function copyPhone(entry: WhatsAppEntry) {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(entry.phone);
      appToast.success(`Copiado: ${entry.name}`);
    } catch {
      appToast.error("No se pudo copiar el teléfono");
    } finally {
      setCopying(false);
    }
  }

  async function copyAll() {
    if (queue.length === 0) {
      appToast.warning("No hay teléfonos pendientes");
      return;
    }
    setCopying(true);
    try {
      await navigator.clipboard.writeText(queue.map((e) => e.phone).join("\n"));
      appToast.success(`${queue.length} teléfonos copiados`);
    } catch {
      appToast.error("No se pudo copiar el listado");
    } finally {
      setCopying(false);
    }
  }

  function confirmInGroup(entry: WhatsAppEntry) {
    if (!canWrite) return;
    startTransition(async () => {
      const result = await updatePlayerChecklistFieldAction({
        id: entry.playerId,
        field: "in_whatsapp_group",
        value: true,
      });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      setLocalDone((prev) => new Set(prev).add(entry.playerId));
      appToast.success(`${entry.name} en el grupo`);
      router.refresh();
    });
  }

  function confirmAllInGroup() {
    if (!canWrite || queue.length === 0) return;
    const ids = queue.map((e) => e.playerId);
    startTransition(async () => {
      const result = await bulkUpdatePlayerChecklistAction({
        player_ids: ids,
        field: "in_whatsapp_group",
        value: true,
      });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      setLocalDone((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return next;
      });
      setBulkConfirmOpen(false);
      appToast.success(
        `${result.updated ?? ids.length} contacto${ids.length === 1 ? "" : "s"} marcados en WhatsApp`,
      );
      router.refresh();
    });
  }

  if (!category) {
    return (
      <p className={cn("text-sm text-[var(--club-fg-muted)]", className)}>
        Elige una categoría para empezar.
      </p>
    );
  }

  if (!current) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-[var(--club-border)] px-4 py-8 text-center",
          className,
        )}
      >
        <p className="font-semibold text-foreground">{doneCount > 0 ? "Listo" : "Nada pendiente"}</p>
        <p className="mt-1.5 text-sm text-[var(--club-fg-muted)]">
          {doneCount > 0
            ? `Has confirmado ${doneCount} contacto${doneCount === 1 ? "" : "s"} en el grupo.`
            : "No hay contactos con estos filtros."}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="rounded-xl border border-[var(--club-border)] bg-[var(--club-drawer-bg)] p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--club-brand-soft)] text-brand">
              <Users className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {doneCount} de {progressTotal}
              </p>
              <p className="text-xs text-[var(--club-fg-muted)]">
                {remaining === 1 ? "Queda 1 pendiente" : `Quedan ${remaining} pendientes`}
              </p>
            </div>
          </div>
        </div>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--club-surface-2)]"
          role="progressbar"
          aria-valuenow={doneCount}
          aria-valuemin={0}
          aria-valuemax={progressTotal}
          aria-label="Progreso de contactos confirmados"
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-h-10 flex-1 gap-1.5"
            disabled={copying || pending || remaining === 0}
            onClick={() => void copyAll()}
          >
            <Copy className="size-3.5" aria-hidden />
            Copiar todos ({remaining})
          </Button>
          {canWrite ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-10 flex-1 gap-1.5"
              disabled={pending || remaining === 0}
              onClick={() => setBulkConfirmOpen(true)}
            >
              <Check className="size-3.5" aria-hidden />
              Marcar todos ({remaining})
            </Button>
          ) : null}
        </div>
      </div>

      <div
        key={current.playerId}
        className="rounded-xl border border-[color-mix(in_srgb,var(--club-brand)_22%,var(--club-border))] bg-[var(--club-surface-2)] px-4 py-4"
      >
        <p className="text-lg font-semibold tracking-tight text-foreground">{current.name}</p>
        <p className="mt-0.5 text-sm text-[var(--club-fg-muted)]">{current.teamName}</p>
        <p className="mt-3 font-mono text-xl tabular-nums tracking-tight text-foreground">
          {current.phone}
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 flex-1 gap-1.5"
            disabled={copying || pending}
            onClick={() => void copyPhone(current)}
          >
            <Copy className="size-4" aria-hidden />
            Copiar
          </Button>
          {canWrite ? (
            <Button
              type="button"
              variant="primary"
              className="min-h-11 flex-1 gap-1.5"
              disabled={pending}
              onClick={() => confirmInGroup(current)}
            >
              <Check className="size-4" aria-hidden />
              {pending ? "Guardando…" : "Añadido al grupo"}
            </Button>
          ) : null}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-[var(--club-fg-muted)]">
        {canWrite
          ? "Uno a uno: copia → pega en WhatsApp → confirma. O usa «Copiar todos» / «Marcar todos» para el filtro entero."
          : "Copia el teléfono o todo el listado. Solo dirección puede marcar quién ya está en el grupo."}
      </p>

      <ConfirmDialog
        open={bulkConfirmOpen}
        onClose={() => {
          if (!pending) setBulkConfirmOpen(false);
        }}
        title={`¿Marcar ${remaining} en WhatsApp?`}
        description={
          remaining === 1
            ? "Se marcará este contacto como añadido al grupo. Solo hazlo si ya lo has metido en WhatsApp."
            : `Se marcarán los ${remaining} contactos filtrados como añadidos al grupo. Solo confirma si ya los has metido todos en WhatsApp.`
        }
        confirmLabel={remaining === 1 ? "Marcar" : `Marcar ${remaining}`}
        pending={pending}
        onConfirm={confirmAllInGroup}
      />
    </div>
  );
}
