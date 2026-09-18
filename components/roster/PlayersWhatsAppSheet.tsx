"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/club/Button";
import { FormSelect } from "@/components/club/forms";
import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import {
  formatTeamCategory,
  TEAM_CATEGORIES,
  TEAM_CATEGORY_LABELS,
  type TeamCategory,
} from "@/lib/roster/constants";
import type { PlayerListItem, Team } from "@/lib/types/db";
import { appToast } from "@/lib/toast";

function normalizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "").trim();
}

export function PlayersWhatsAppSheet({
  open,
  onClose,
  players,
  teams,
}: {
  open: boolean;
  onClose: () => void;
  players: PlayerListItem[];
  teams: Team[];
}) {
  const categoriesInUse = useMemo(() => {
    const present = new Set(
      players
        .filter((player) => player.is_active)
        .map((player) => player.team?.category)
        .filter(Boolean),
    );
    return TEAM_CATEGORIES.filter((category) => present.has(category));
  }, [players]);

  const [category, setCategory] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("all");
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

  const phones = useMemo(() => {
    if (!category) return [];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const player of players) {
      if (!player.is_active) continue;
      if (player.team?.category !== category) continue;
      if (teamId !== "all" && player.team_id !== teamId) continue;
      if (onlyMissingWhatsapp && player.in_whatsapp_group) continue;
      const phone = player.primary_phone?.trim();
      if (!phone) continue;
      const key = normalizePhone(phone);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      list.push(phone.trim());
    }
    return list;
  }, [players, category, teamId, onlyMissingWhatsapp]);

  async function copyList() {
    if (phones.length === 0) {
      appToast.warning("No hay teléfonos con estos filtros");
      return;
    }
    const text = phones.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      appToast.success(`${phones.length} teléfonos copiados`);
    } catch {
      appToast.error("No se pudo copiar. Selecciona el listado a mano.");
    }
  }

  return (
    <ClothingBottomSheet
      open={open}
      onClose={onClose}
      title="Teléfonos para WhatsApp"
      description="Contacto primario por categoría. Copia el listado y pégalo al crear el grupo; luego márcalos en la lista con WA."
      primaryAction={{
        label: phones.length ? `Copiar listado (${phones.length})` : "Copiar listado",
        onClick: () => void copyList(),
        disabled: !category || phones.length === 0,
      }}
      secondaryAction={{ label: "Cerrar", onClick: onClose }}
    >
      <div className="flex flex-col gap-4">
        <FormSelect
          label="Categoría"
          name="whatsapp-category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setTeamId("all");
          }}
          options={categoryOptions}
          placeholder="Elige categoría…"
        />
        <FormSelect
          label="Equipo (opcional)"
          name="whatsapp-team"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          options={teamOptions}
          disabled={!category}
        />
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            className="size-4 shrink-0 rounded border-[var(--club-border)] accent-brand"
            checked={onlyMissingWhatsapp}
            onChange={(e) => setOnlyMissingWhatsapp(e.target.checked)}
          />
          <span className="text-sm font-medium text-foreground">Solo quien aún no está en el grupo</span>
        </label>

        {!category ? (
          <p className="text-sm text-muted-foreground">Elige una categoría para ver los teléfonos.</p>
        ) : phones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay teléfonos de contacto primario con estos filtros.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {phones.length} teléfono{phones.length === 1 ? "" : "s"}
              </p>
              <Button type="button" variant="secondary" size="sm" className="min-h-9" onClick={() => void copyList()}>
                Copiar
              </Button>
            </div>
            <pre className="max-h-56 overflow-auto rounded-xl border border-[var(--club-border)] bg-[var(--club-surface-2)] px-3 py-2.5 font-mono text-sm leading-relaxed text-foreground tabular-nums">
              {phones.join("\n")}
            </pre>
          </div>
        )}
      </div>
    </ClothingBottomSheet>
  );
}
