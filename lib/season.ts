/**
 * Club season helpers.
 *
 * Today the active season is derived from the calendar (1 September rollover).
 * Each Supabase row (teams, players, clothing_*) still stores its own `season`
 * text for history and filtering — there is no single `portal_settings` row yet.
 *
 * Future: read override from Supabase when a club config table exists.
 */

/** Canonical season id stored in DB, e.g. `"2026-27"`. */
export type SeasonId = string;

/** European club convention: new season on 1 September. */
const SEASON_START_MONTH = 8; // September (0-indexed)

/**
 * Returns the active club season for a given date.
 * Before 1 Sep → previous academic year; from 1 Sep → current pair.
 *
 * @example
 * getCurrentSeason(new Date("2026-08-31")) // "2025-26"
 * getCurrentSeason(new Date("2026-09-01")) // "2026-27"
 */
export function getCurrentSeason(referenceDate: Date = new Date()): SeasonId {
  const year = referenceDate.getFullYear();
  const seasonStartYear =
    referenceDate.getMonth() >= SEASON_START_MONTH ? year : year - 1;
  const endShort = (seasonStartYear + 1) % 100;
  return `${seasonStartYear}-${String(endShort).padStart(2, "0")}`;
}

/** Display helper: `"2026-27"` → `"26/27"`. */
export function formatSeasonShort(season: SeasonId): string {
  const [start, end] = season.split("-");
  if (!start || !end) return season;
  return `${start.slice(-2)}/${end}`;
}

/** Parse start year from season id for references like PED-2026-01. */
export function seasonStartYear(season: SeasonId): number {
  const year = Number(season.split("-")[0]);
  return Number.isFinite(year) ? year : new Date().getFullYear();
}
