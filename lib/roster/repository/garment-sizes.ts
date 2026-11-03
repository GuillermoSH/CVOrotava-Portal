
import { dbErrorMessage } from "@/lib/clothing/repository/helpers";
import {
  GARMENT_CATEGORIES,
  isGarmentCategory,
  type PlayerGarmentSizes,
} from "@/lib/roster/garment-sizes";
import type { RosterDb } from "@/lib/roster/repository/client";
import type { ClothingSize } from "@/lib/types/db";

type Db = RosterDb;

export async function getPlayerGarmentSizes(
  db: Db,
  playerId: string,
): Promise<PlayerGarmentSizes> {
  const { data, error } = await db
    .from("player_clothing_sizes")
    .select("category, size")
    .eq("player_id", playerId);
  if (error) throw new Error(dbErrorMessage(error));

  const sizes: PlayerGarmentSizes = {};
  for (const row of data ?? []) {
    if (isGarmentCategory(row.category)) sizes[row.category] = row.size as ClothingSize;
  }
  return sizes;
}

/** Deja exactamente las tallas indicadas: lo que falta se borra. */
export async function replacePlayerGarmentSizes(
  db: Db,
  playerId: string,
  sizes: PlayerGarmentSizes,
): Promise<void> {
  const rows = GARMENT_CATEGORIES.flatMap((category) => {
    const size = sizes[category];
    return size ? [{ player_id: playerId, category, size }] : [];
  });
  const keep = rows.map((row) => row.category);

  if (rows.length > 0) {
    const { error } = await db
      .from("player_clothing_sizes")
      .upsert(rows, { onConflict: "player_id,category" });
    if (error) throw new Error(dbErrorMessage(error));
  }

  const del = db.from("player_clothing_sizes").delete().eq("player_id", playerId);
  const { error } = keep.length
    ? await del.not("category", "in", `(${keep.join(",")})`)
    : await del;
  if (error) throw new Error(dbErrorMessage(error));
}

/**
 * Otro jugador activo del mismo equipo con ese dorsal. Las bajas no cuentan: su dorsal queda
 * libre para otra persona. Devuelve su nombre, o null si el dorsal está libre.
 */
export async function findJerseyConflict(
  db: Db,
  {
    teamId,
    jerseyNumber,
    excludePlayerId,
  }: { teamId: string; jerseyNumber: number; excludePlayerId?: string },
): Promise<string | null> {
  let query = db
    .from("players")
    .select("full_name")
    .eq("team_id", teamId)
    .eq("jersey_number", jerseyNumber)
    .eq("is_active", true)
    .limit(1);
  if (excludePlayerId) query = query.neq("id", excludePlayerId);

  const { data, error } = await query;
  if (error) throw new Error(dbErrorMessage(error));
  return data?.[0]?.full_name ?? null;
}
