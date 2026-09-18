import "server-only";

import { formatJerseyNumber } from "@/lib/clothing/formatJersey";
import {
  computePossessionFromMovements,
  findTeamJerseyConflict,
} from "@/lib/clothing/possession";
import type { ClothingDb } from "@/lib/clothing/repository/client";
import { dbErrorMessage, productMapFromList } from "@/lib/clothing/repository/helpers";
import { listStockMovements } from "@/lib/clothing/repository/inventory";
import { mapStockMovement } from "@/lib/clothing/repository/mappers";
import { listActivePlayers } from "@/lib/clothing/repository/players";
import { getProductById, listProducts } from "@/lib/clothing/repository/products";
import type { ClothingSize, ClothingStockMovement, PlayerWithTeam } from "@/lib/types/db";

/**
 * Blocks delivering a competition shirt #N when another active teammate
 * still has that number in possession (delivery not returned).
 */
export async function assertTeamJerseyAvailable(
  db: ClothingDb,
  input: {
    player: PlayerWithTeam;
    lines: {
      productId: string;
      size: ClothingSize;
      jerseyNumber?: number | null;
    }[];
  },
): Promise<void> {
  if (!input.player.team_id) return;

  const competitionLines: { jerseyNumber: number; productId: string }[] = [];
  for (const line of input.lines) {
    const jersey = line.jerseyNumber ?? null;
    if (jersey == null) continue;
    const product = await getProductById(db, line.productId);
    if (!product || product.category !== "shirt_competition") continue;
    competitionLines.push({ jerseyNumber: jersey, productId: line.productId });
  }

  if (competitionLines.length === 0) return;

  const [teammates, movements, products] = await Promise.all([
    listActivePlayers(db, input.player.season),
    listStockMovements(db, ["delivery", "return"]),
    listProducts(db),
  ]);

  const teamPlayerIds = new Set(
    teammates
      .filter(
        (p) =>
          p.team_id === input.player.team_id &&
          p.season === input.player.season &&
          p.is_active,
      )
      .map((p) => p.id),
  );

  const productMap = productMapFromList(products);
  const playerNameById = new Map(teammates.map((p) => [p.id, p.full_name]));
  const possession = computePossessionFromMovements(movements, productMap, playerNameById);

  for (const line of competitionLines) {
    const conflict = findTeamJerseyConflict(possession, {
      teamPlayerIds,
      excludePlayerId: input.player.id,
      jerseyNumber: line.jerseyNumber,
    });
    if (conflict) {
      const teamName = input.player.team?.name ?? "el equipo";
      throw new Error(
        `${formatJerseyNumber(line.jerseyNumber)} ya lo tiene ${conflict.player_name} en ${teamName}`,
      );
    }
  }
}

export async function getMovementById(
  db: ClothingDb,
  id: string,
): Promise<ClothingStockMovement | null> {
  const { data, error } = await db
    .from("clothing_stock_movements")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(dbErrorMessage(error));
  return data ? mapStockMovement(data) : null;
}
