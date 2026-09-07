import { dbErrorMessage } from "@/lib/clothing/repository/helpers";
import { mapPlayerWithTeam, type PlayerRow } from "@/lib/roster/mappers";
import { getCurrentSeason } from "@/lib/season";
import type { PlayerWithTeam } from "@/lib/types/db";

import type { ClothingDb } from "@/lib/clothing/repository/client";

const PLAYER_SELECT =
  "id, full_name, birth_date, team_id, user_id, season, is_active, team:teams(id, name, category, gender, season)";

export async function listActivePlayers(
  db: ClothingDb,
  season: string = getCurrentSeason(),
): Promise<PlayerWithTeam[]> {
  const { data, error } = await db
    .from("players")
    .select(PLAYER_SELECT)
    .eq("season", season)
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) throw new Error(dbErrorMessage(error));
  return (data ?? []).map((row) => mapPlayerWithTeam(row as PlayerRow));
}

export async function getPlayerById(db: ClothingDb, id: string): Promise<PlayerWithTeam | null> {
  const { data, error } = await db
    .from("players")
    .select(PLAYER_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(dbErrorMessage(error));
  return data ? mapPlayerWithTeam(data as PlayerRow) : null;
}
