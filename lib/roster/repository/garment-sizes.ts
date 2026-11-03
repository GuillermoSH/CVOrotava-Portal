
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
