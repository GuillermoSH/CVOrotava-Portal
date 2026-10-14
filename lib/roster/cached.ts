import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { rosterSeasonTag } from "@/lib/cache/tags";
import { countInactivePlayers } from "@/lib/roster/repository/players";
import { listTeams } from "@/lib/roster/repository/teams";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Team } from "@/lib/types/db";

/**
 * Datos de plantilla que no dependen del usuario y que casi nunca cambian.
 * Cacheados sin cookies (service role); la autorización va siempre fuera, en la
 * página. Se invalidan con `invalidateRoster(season)` al tocar jugadores o equipos.
 */

/** Equipos de la temporada (filtros, selects y categoría → audiencia de tarifa). */
export async function getCachedTeams(season: string): Promise<Team[]> {
  "use cache";
  cacheTag(rosterSeasonTag(season));
  cacheLife("hours");

  return listTeams(createServiceRoleClient(), season);
}

/** Cuántos jugadores inactivos hay (aviso del listado). */
export async function getCachedInactiveCount(season: string): Promise<number> {
  "use cache";
  cacheTag(rosterSeasonTag(season));
  cacheLife("hours");

  return countInactivePlayers(createServiceRoleClient(), season);
}
