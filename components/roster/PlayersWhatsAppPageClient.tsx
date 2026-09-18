"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/club/Button";
import { FormSelect } from "@/components/club/forms";
import { DashboardPage } from "@/components/layout/DashboardPage";
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

export function PlayersWhatsAppPageClient({
  players,
  teams,
  subtitle,
  backHref,
}: {
  players: PlayerListItem[];
  teams: Team[];
  subtitle: string;
  backHref: string;
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

  const [category, setCategory] = useState<string>(categoriesInUse[0] ?? "");
  const [teamId, setTeamId] = useState<string>("all");
  const [onlyMissingWhatsapp, setOnlyMissingWhatsapp] = useState(true);

  const categoryOptions = useMemo(() => {
    const list = (categoriesInUse.length ? categoriesInUse : TEAM_CATEGORIES).map((value) => ({
      value,
      label: TEAM_CATEGORY_LABELS[value as TeamCategory] ?? formatTeamCategory(value),
    }));
    return list;
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
    try {
      await navigator.clipboard.writeText(phones.join("\n"));
      appToast.success(`${phones.length} teléfonos copiados`);
    } catch {
      appToast.error("No se pudo copiar. Selecciona el listado a mano.");
    }
  }

  return (
    <DashboardPage
      title="Teléfonos WhatsApp"
      subtitle={subtitle}
      actions={
        <Link href={backHref} className="btn-secondary hidden md:inline-flex">
          Volver a jugadores
        </Link>
      }
    >
      <div className="flex max-w-xl flex-col gap-5">
        <FormSelect
          label="Categoría"
          name="whatsapp-category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setTeamId("all");
          }}
          options={categoryOptions}
          placeholder={categoryOptions.length ? undefined : "Sin categorías"}
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-foreground tabular-nums">
            {phones.length} teléfono{phones.length === 1 ? "" : "s"}
          </p>
          <Button
            type="button"
            className="min-h-11"
            disabled={!category || phones.length === 0}
            onClick={() => void copyList()}
          >
            Copiar listado
          </Button>
        </div>

        {!category ? (
          <p className="text-sm text-muted-foreground">Elige una categoría para ver los teléfonos.</p>
        ) : phones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay teléfonos de contacto primario con estos filtros.
          </p>
        ) : (
          <pre className="max-h-[50vh] overflow-auto rounded-xl border border-[var(--club-border)] bg-[var(--club-surface-2)] px-3 py-2.5 font-mono text-sm leading-relaxed text-foreground tabular-nums">
            {phones.join("\n")}
          </pre>
        )}

        <p className="text-sm text-muted-foreground">
          Tras añadirlos al grupo, márcalos en la lista de jugadores con la columna WA (o en lote).
        </p>

        <Link href={backHref} className="btn-secondary min-h-11 md:hidden">
          Volver a jugadores
        </Link>
      </div>
    </DashboardPage>
  );
}
