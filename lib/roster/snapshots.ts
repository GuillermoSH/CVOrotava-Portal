import "server-only";

import { getRosterDb } from "@/lib/roster/repository/client";
import {
  countInactivePlayers,
  getPlayerById,
  listPlayersPage,
  listPlayersWithPrimaryPhone,
  type ListPlayersPageInput,
} from "@/lib/roster/repository/players";
import { listTeams } from "@/lib/roster/repository/teams";
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
    listTeams(db, season),
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
    listTeams(db, season),
    countInactivePlayers(db, season),
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

export async function getPlayerDetailsSnapshot(
  id: string,
): Promise<{ player: PlayerWithDetails; teams: Team[] } | null> {
  const db = await getRosterDb();
  const player = await getPlayerById(db, id);
  if (!player) return null;
  const teams = await listTeams(db, player.season);
  return { player, teams };
}

export async function getTeamsSnapshot(season: string = getCurrentSeason()): Promise<Team[]> {
  const db = await getRosterDb();
  return listTeams(db, season);
}
