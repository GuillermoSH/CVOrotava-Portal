"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/club/Badge";
import { ClothingFilterChips } from "@/components/clothing/ClothingFilterChips";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { Input } from "@/components/club/Input";
import { DashboardPage } from "@/components/layout/DashboardPage";
import { PlayersImportSheet } from "@/components/roster/PlayersImportSheet";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { formatPlayerName, formatTeamCategory } from "@/lib/roster/constants";
import { appRoutes } from "@/lib/constants";
import type { PlayerWithTeam, Team } from "@/lib/types/db";

export function PlayersPageClient({
  players,
  teams,
  canWrite,
  subtitle,
}: {
  players: PlayerWithTeam[];
  teams: Team[];
  canWrite: boolean;
  subtitle: string;
}) {
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");
  const [importOpen, setImportOpen] = useState(false);

  const searching = query.trim().length > 0;
  const inactiveCount = useMemo(
    () => players.filter((player) => !player.is_active).length,
    [players],
  );
  const showTeamFilter = teams.length > 1;
  const showBajasToggle = inactiveCount > 0;

  const visible = useMemo(() => {
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
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [players, query, teamFilter, statusFilter]);

  const teamOptions = [
    { value: "all", label: "Todos", count: players.filter((p) => statusFilter === "all" || p.is_active).length },
    ...teams.map((team) => ({
      value: team.id,
      label: team.name,
      count: players.filter(
        (player) => player.team_id === team.id && (statusFilter === "all" || player.is_active),
      ).length,
    })),
  ];

  return (
    <DashboardPage
      subtitle={subtitle}
      actions={
        canWrite ? (
          <div className="clothing-toolbar hidden md:flex">
            <button type="button" className="btn-secondary" onClick={() => setImportOpen(true)}>
              Importar Excel
            </button>
            <Link href={appRoutes.players.new} className="btn-primary">
              Nuevo jugador
            </Link>
          </div>
        ) : null
      }
    >
      <div className="flex flex-col gap-3">
        <div className={showBajasToggle ? "flex flex-col gap-3 md:flex-row md:items-center" : undefined}>
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, DNI o equipo"
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
          <ul className="flex flex-col gap-3">
            {visible.map((player) => (
              <li key={player.id}>
                <Link href={appRoutes.players.detail(player.id)} className="clothing-list-card block">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate font-semibold tracking-tight text-foreground">
                      {formatPlayerName(player)}
                    </p>
                    {player.is_active ? null : (
                      <Badge variant="secondary" className="text-[11px]">
                        Baja
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {player.team?.name ?? "Sin equipo"}
                    {player.clothing_size ? ` · ${formatClothingSize(player.clothing_size)}` : null}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant={player.license_completed ? "success" : "warning"} className="text-[11px]">
                      {player.license_completed ? "Licencia" : "Sin licencia"}
                    </Badge>
                    <Badge
                      variant={player.registration_papers_received ? "success" : "secondary"}
                      className="text-[11px]"
                    >
                      {player.registration_papers_received ? "Papeles" : "Faltan papeles"}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canWrite ? (
        <ClothingStickyActionBar
          actions={[
            { type: "button", label: "Importar", onClick: () => setImportOpen(true), variant: "secondary" },
            { type: "link", label: "Nuevo jugador", href: appRoutes.players.new },
          ]}
        />
      ) : null}

      {canWrite ? <PlayersImportSheet open={importOpen} onClose={() => setImportOpen(false)} /> : null}
    </DashboardPage>
  );
}
