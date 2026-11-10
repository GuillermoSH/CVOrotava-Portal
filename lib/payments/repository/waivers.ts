import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { FeeWaiverLike } from "@/lib/payments/fees";
import { isMissingTableError } from "@/lib/payments/repository/exemptions";
import type { SeasonId } from "@/lib/season";

/**
 * Anulaciones de lo pendiente (`payment_waivers`): importe que el club decide no cobrar de un
 * concepto/mes de un jugador. Aditivas y reversibles: no tocan `payments`. Tabla cerrada a
 * `authenticated`: solo se lee y escribe con service role.
 */

export type PlayerWaiver = FeeWaiverLike;

/**
 * Anulaciones de la temporada por jugador. Si la tabla aún no existe se trata como «sin
 * anulaciones» (y se avisa en el log) para no romper los pagos antes de aplicar la migración.
 */
export async function listSeasonWaivers(
  db: SupabaseClient,
  season: SeasonId,
): Promise<Map<string, PlayerWaiver[]>> {
  const { data, error } = await db
    .from("payment_waivers")
    .select("player_id, fee_code, billing_month, amount, reason")
    .eq("season", season);

  if (error) {
    if (isMissingTableError(error)) {
      console.warn("payment_waivers no existe todavía: aplica la migración de anulaciones.");
      return new Map();
    }
    throw new Error(`payment_waivers: ${error.message}`);
  }

  const byPlayer = new Map<string, PlayerWaiver[]>();
  for (const row of data ?? []) {
    const playerId = row.player_id as string;
    const list = byPlayer.get(playerId) ?? [];
    list.push({
      fee_code: row.fee_code as string,
      billing_month: Number(row.billing_month ?? 0),
      amount: Number(row.amount),
      reason: (row.reason as string | null) ?? null,
    });
    byPlayer.set(playerId, list);
  }
  return byPlayer;
}

/** Crea o actualiza la anulación de un concepto/mes (un solo importe por concepto). */
export async function setWaiver(
  db: SupabaseClient,
  opts: {
    playerId: string;
    season: SeasonId;
    feeCode: string;
    billingMonth: number;
    amount: number;
    reason: string | null;
    createdBy: string | null;
  },
): Promise<void> {
  const { error } = await db.from("payment_waivers").upsert(
    {
      player_id: opts.playerId,
      season: opts.season,
      fee_code: opts.feeCode,
      billing_month: opts.billingMonth,
      amount: opts.amount,
      reason: opts.reason,
      created_by: opts.createdBy,
    },
    { onConflict: "player_id,season,fee_code,billing_month" },
  );
  if (error) {
    throw new Error(
      isMissingTableError(error)
        ? "Falta aplicar la migración de anulaciones (payment_waivers)."
        : error.message,
    );
  }
}

/** Quita la anulación: lo que faltaba vuelve a figurar como pendiente. */
export async function removeWaiver(
  db: SupabaseClient,
  opts: { playerId: string; season: SeasonId; feeCode: string; billingMonth: number },
): Promise<void> {
  const { error } = await db
    .from("payment_waivers")
    .delete()
    .eq("player_id", opts.playerId)
    .eq("season", opts.season)
    .eq("fee_code", opts.feeCode)
    .eq("billing_month", opts.billingMonth);
  if (error && !isMissingTableError(error)) throw new Error(error.message);
}
