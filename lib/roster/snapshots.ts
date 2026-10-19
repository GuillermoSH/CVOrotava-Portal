import "server-only";

import { getCachedInactiveCount, getCachedTeams } from "@/lib/roster/cached";
import { getRosterDb } from "@/lib/roster/repository/client";
import {
  getPlayerById,
  listPlayersPage,
  listPlayersWithPrimaryPhone,
  type ListPlayersPageInput,
} from "@/lib/roster/repository/players";
import { formatPlayerName } from "@/lib/roster/constants";
import type { PlayerNavItem } from "@/lib/roster/player-filters";
import { getCurrentSeason } from "@/lib/season";
import type { PlayerListItem, PlayerWithDetails, Team } from "@/lib/types/db";

export async function getRosterSnapshot(season: string = getCurrentSeason()): Promise<{
  players: PlayerListItem[];
  teams: Team[];
  season: string;
}> {
  const db = await getRosterDb();
  const [players, teams] = await Promise.all([
    listPlayersWithPrimaryPhone(db, season),
    getCachedTeams(season),
  ]);
  return { players, teams, season };
}

export async function getPlayersListSnapshot(
  input: ListPlayersPageInput = {},
): Promise<{
  players: PlayerListItem[];
  teams: Team[];
  season: string;
  total: number;
  page: number;
  pageSize: number;
  inactiveCount: number;
}> {
  const season = input.season ?? getCurrentSeason();
  const db = await getRosterDb();
  const [pageResult, teams, inactiveCount] = await Promise.all([
    listPlayersPage(db, { ...input, season }),
    getCachedTeams(season),
    getCachedInactiveCount(season),
  ]);
  return {
    players: pageResult.players,
    teams,
    season,
    total: pageResult.total,
    page: pageResult.page,
    pageSize: pageResult.pageSize,
    inactiveCount,
  };
}

/** Jugadores de la lista (con sus filtros y orden, todas las páginas) para navegar entre fichas. */
export async function getPlayerNavigationItems(
  input: Omit<ListPlayersPageInput, "page" | "pageSize"> = {},
): Promise<PlayerNavItem[]> {
  const db = await getRosterDb();
  const result = await listPlayersPage(db, { ...input, page: 1, pageSize: 0 });
  return result.players.map((player) => ({ id: player.id, name: formatPlayerName(player) }));
}

export async function getPlayerDetailsSnapshot(
  id: string,
): Promise<{ player: PlayerWithDetails; teams: Team[] } | null> {
  const db = await getRosterDb();
  const player = await getPlayerById(db, id);
  if (!player) return null;
  const teams = await getCachedTeams(player.season);
  return { player, teams };
}

export async function getTeamsSnapshot(season: string = getCurrentSeason()): Promise<Team[]> {
  return getCachedTeams(season);
}
