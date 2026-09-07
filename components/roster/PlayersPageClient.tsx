"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/club/Badge";
import { ClothingFilterChips } from "@/components/clothing/ClothingFilterChips";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { Input } from "@/components/club/Input";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { formatPlayerName, formatTeamCategory } from "@/lib/roster/constants";
import { appRoutes } from "@/lib/constants";
import type { PlayerWithTeam, Team } from "@/lib/types/db";

export function PlayersPageClient({
  players,
  teams,
  canWrite,
}: {
  players: PlayerWithTeam[];
  teams: Team[];
  canWrite: boolean;
}) {
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players.filter((player) => {
      if (statusFilter === "active" && !player.is_active) return false;
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
    <>
      <div className="clothing-page-with-sticky flex flex-col gap-4">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, DNI o equipo"
          aria-label="Buscar jugadores"
          className="min-h-11"
        />

        <ClothingFilterChips
          options={teamOptions}
          value={teamFilter}
          onChange={setTeamFilter}
          ariaLabel="Filtrar por equipo"
        />

        <div className="flex gap-2">
          <button
            type="button"
            className={statusFilter === "active" ? "clothing-filter-chip clothing-filter-chip--active" : "clothing-filter-chip"}
            onClick={() => setStatusFilter("active")}
          >
            Activos
          </button>
          <button
            type="button"
            className={statusFilter === "all" ? "clothing-filter-chip clothing-filter-chip--active" : "clothing-filter-chip"}
            onClick={() => setStatusFilter("all")}
          >
            Todos
          </button>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--club-border)] px-6 py-10 text-center">
            <p className="font-medium text-foreground">
              {players.length === 0 ? "Aún no hay jugadores" : "Ningún jugador coincide"}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {players.length === 0
                ? "Da de alta la plantilla de la temporada para entregas de ropa y trámites."
                : "Prueba otro equipo o búsqueda."}
            </p>
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
          actions={[{ type: "link", label: "Nuevo jugador", href: appRoutes.players.new }]}
        />
      ) : null}
    </>
  );
}
