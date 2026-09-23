import { dbErrorMessage } from "@/lib/clothing/repository/helpers";
import {
  federationBaseTeamName,
  type FederationTeamKey,
} from "@/lib/roster/federation-import";
import { mapTeam } from "@/lib/roster/mappers";
import type { RosterDb } from "@/lib/roster/repository/client";
import { getCurrentSeason } from "@/lib/season";
import type { Team } from "@/lib/types/db";
import type { TeamCategory, TeamGender } from "@/lib/roster/constants";

function foldTeamName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

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

/**
 * Find-or-create equipo base federativo `{Categoría} {Género}` (sin A/B/C).
 */
export async function ensureFederationBaseTeam(
  db: RosterDb,
  input: {
    category: TeamCategory;
    gender: TeamGender;
    season: string;
  },
): Promise<Team> {
  const name = federationBaseTeamName(input.category, input.gender);
  if (!name) {
    throw new Error("No se pudo formar el nombre del equipo federativo");
  }
  const teams = await listTeams(db, input.season);
  const existing = teams.find(
    (team) =>
      team.category === input.category &&
      team.gender === input.gender &&
      foldTeamName(team.name) === foldTeamName(name),
  );
  if (existing) return existing;
  return createTeam(db, {
    name,
    category: input.category,
    gender: input.gender,
    season: input.season,
  });
}

export async function ensureFederationBaseTeams(
  db: RosterDb,
  keys: FederationTeamKey[],
  season: string,
): Promise<Map<string, Team>> {
  const byName = new Map<string, Team>();
  for (const key of keys) {
    const team = await ensureFederationBaseTeam(db, {
      category: key.category,
      gender: key.gender,
      season,
    });
    byName.set(foldTeamName(team.name), team);
  }
  return byName;
}
