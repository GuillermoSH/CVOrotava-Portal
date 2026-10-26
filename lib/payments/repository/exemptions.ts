import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { SeasonId } from "@/lib/season";

/**
 * Jugadores exentos de pagos por temporada (`payment_exemptions`, compartida con Team Manager).
 * Contrato común: exento = existe una fila (player_id, season). La tabla está cerrada a
 * `authenticated` (el motivo puede ser sensible): solo se lee y escribe con service role.
 */

export type Exemption = { reason: string | null };

/** Códigos de «la tabla no existe»: Postgres (42P01) y PostgREST (PGRST205). */
export function isMissingTableError(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /could not find the table|does not exist/i.test(error.message ?? "")
  );
}

/**
 * Ids de los exentos de la temporada. Si la tabla aún no existe se trata como «sin exentos»
 * (y se avisa en el log) para no romper los pagos antes de aplicar la migración.
 */
export async function listExemptPlayerIds(
  db: SupabaseClient,
  season: SeasonId,
): Promise<Set<string>> {
  const { data, error } = await db
    .from("payment_exemptions")
    .select("player_id")
    .eq("season", season);

  if (error) {
    if (isMissingTableError(error)) {
      console.warn("payment_exemptions no existe todavía: aplica la migración de exenciones.");
      return new Set();
    }
    throw new Error(`payment_exemptions: ${error.message}`);
  }
  return new Set((data ?? []).map((row) => row.player_id as string));
}

export async function getExemption(
  db: SupabaseClient,
  playerId: string,
  season: SeasonId,
): Promise<Exemption | null> {
  const { data, error } = await db
    .from("payment_exemptions")
    .select("reason")
    .eq("player_id", playerId)
    .eq("season", season)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return null;
    throw new Error(`payment_exemptions: ${error.message}`);
  }
  return data ? { reason: (data.reason as string | null) ?? null } : null;
}

export async function setExemption(
  db: SupabaseClient,
  opts: { playerId: string; season: SeasonId; reason: string | null; createdBy: string | null },
): Promise<void> {
  const { error } = await db.from("payment_exemptions").upsert(
    {
      player_id: opts.playerId,
      season: opts.season,
      reason: opts.reason,
      created_by: opts.createdBy,
    },
    { onConflict: "player_id,season" },
  );
  if (error) {
    throw new Error(
      isMissingTableError(error)
        ? "Falta aplicar la migración de exenciones (payment_exemptions)."
        : error.message,
    );
  }
}

export async function removeExemption(
  db: SupabaseClient,
  playerId: string,
  season: SeasonId,
): Promise<void> {
  const { error } = await db
    .from("payment_exemptions")
    .delete()
    .eq("player_id", playerId)
    .eq("season", season);
  if (error && !isMissingTableError(error)) throw new Error(error.message);
}
