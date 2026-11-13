import "server-only";

import type { ClothingDb } from "@/lib/clothing/repository/client";
import { dbErrorMessage } from "@/lib/clothing/repository/helpers";
import type { PlannedRowInput } from "@/lib/clothing/plannedDeliveries";
import type { ClothingPlannedDelivery, ClothingSize } from "@/lib/types/db";

type PlannedRow = {
  id: string;
  order_id: string;
  player_id: string;
  product_id: string;
  size: string;
  jersey_number: number | null;
  delivered_at: string | null;
  created_at: string;
};

function mapPlanned(row: PlannedRow): ClothingPlannedDelivery {
  return {
    id: row.id,
    order_id: row.order_id,
    player_id: row.player_id,
    product_id: row.product_id,
    size: row.size as ClothingSize,
    jersey_number: row.jersey_number ?? null,
    delivered_at: row.delivered_at ?? null,
    created_at: row.created_at,
  };
}

/** Previsiones de un pedido (pendientes y entregadas). */
export async function listPlannedByOrder(
  db: ClothingDb,
  orderId: string,
): Promise<ClothingPlannedDelivery[]> {
  const { data, error } = await db
    .from("clothing_planned_deliveries")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(dbErrorMessage(error));
  return ((data ?? []) as PlannedRow[]).map(mapPlanned);
}

/** Todas las previsiones aún sin entregar (la pantalla de entregas filtra por jugador). */
export async function listPendingPlanned(db: ClothingDb): Promise<ClothingPlannedDelivery[]> {
  const { data, error } = await db
    .from("clothing_planned_deliveries")
    .select("*")
    .is("delivered_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(dbErrorMessage(error));
  return ((data ?? []) as PlannedRow[]).map(mapPlanned);
}

export async function listPendingPlannedForPlayer(
  db: ClothingDb,
  playerId: string,
): Promise<ClothingPlannedDelivery[]> {
  const { data, error } = await db
    .from("clothing_planned_deliveries")
    .select("*")
    .eq("player_id", playerId)
    .is("delivered_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(dbErrorMessage(error));
  return ((data ?? []) as PlannedRow[]).map(mapPlanned);
}

/**
 * Sustituye las previsiones pendientes de un pedido por `rows`. Las ya entregadas no se tocan
 * (son historia de lo entregado).
 */
export async function replacePendingPlanned(
  db: ClothingDb,
  orderId: string,
  rows: readonly PlannedRowInput[],
  createdBy: string | null,
): Promise<void> {
  const { error: deleteError } = await db
    .from("clothing_planned_deliveries")
    .delete()
    .eq("order_id", orderId)
    .is("delivered_at", null);
  if (deleteError) throw new Error(dbErrorMessage(deleteError));

  if (rows.length === 0) return;

  const { error: insertError } = await db.from("clothing_planned_deliveries").insert(
    rows.map((row) => ({
      order_id: orderId,
      player_id: row.player_id,
      product_id: row.product_id,
      size: row.size,
      jersey_number: row.jersey_number,
      created_by: createdBy,
    })),
  );
  if (insertError) throw new Error(dbErrorMessage(insertError));
}

export async function markPlannedDelivered(db: ClothingDb, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await db
    .from("clothing_planned_deliveries")
    .update({ delivered_at: new Date().toISOString() })
    .in("id", [...ids])
    .is("delivered_at", null);
  if (error) throw new Error(dbErrorMessage(error));
}

/** Previsiones ya entregadas de un jugador (para reabrirlas al devolver una prenda). */
export async function listDeliveredPlannedForPlayer(
  db: ClothingDb,
  playerId: string,
): Promise<ClothingPlannedDelivery[]> {
  const { data, error } = await db
    .from("clothing_planned_deliveries")
    .select("*")
    .eq("player_id", playerId)
    .not("delivered_at", "is", null)
    .order("delivered_at", { ascending: false });
  if (error) throw new Error(dbErrorMessage(error));
  return ((data ?? []) as PlannedRow[]).map(mapPlanned);
}

/** Devuelve a pendientes previsiones entregadas (al anular o devolver la entrega). */
export async function reopenPlanned(db: ClothingDb, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await db
    .from("clothing_planned_deliveries")
    .update({ delivered_at: null })
    .in("id", [...ids])
    .not("delivered_at", "is", null);
  if (error) throw new Error(dbErrorMessage(error));
}
