import { dbErrorMessage } from "@/lib/clothing/repository/helpers";
import { mapTeam } from "@/lib/roster/mappers";
import type { RosterDb } from "@/lib/roster/repository/client";
import { getCurrentSeason } from "@/lib/season";
import type { Team } from "@/lib/types/db";

export async function listTeams(
  db: RosterDb,
  season: string = getCurrentSeason(),
): Promise<Team[]> {
  const { data, error } = await db
    .from("teams")
    .select("id, name, category, gender, season")
    .eq("season", season)
    .order("name", { ascending: true });

  if (error) throw new Error(dbErrorMessage(error));
  return (data ?? []).map(mapTeam);
}

export async function getTeamById(db: RosterDb, id: string): Promise<Team | null> {
  const { data, error } = await db
    .from("teams")
    .select("id, name, category, gender, season")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(dbErrorMessage(error));
  return data ? mapTeam(data) : null;
}

export async function createTeam(
  db: RosterDb,
  input: {
    name: string;
    category: string;
    gender: "male" | "female";
    season: string;
  },
): Promise<Team> {
  const { data, error } = await db
    .from("teams")
    .insert({
      name: input.name,
      category: input.category,
      gender: input.gender,
      season: input.season,
    })
    .select("id, name, category, gender, season")
    .single();

  if (error) throw new Error(dbErrorMessage(error));
  return mapTeam(data);
}
