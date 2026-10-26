"use server";

import { invalidatePayments } from "@/lib/cache/invalidate";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { EXEMPT_PLAYER_ERROR } from "@/lib/payments/constants";
import { getPaymentsDb } from "@/lib/payments/repository/client";
import { listExemptPlayerIds } from "@/lib/payments/repository/exemptions";
import { createPayment, createPayments } from "@/lib/payments/repository/payments";
import { registerBulkPaymentsSchema, registerPaymentSchema } from "@/lib/payments/schemas";
import { getPlayerById, listPlayerUserIds } from "@/lib/roster/repository/players";
import { getCurrentSeason } from "@/lib/season";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };
export type BulkActionResult = { ok: true; created: number } | { ok: false; error: string };

export async function registerPaymentAction(input: unknown): Promise<ActionResult> {
  try {
    await requirePaymentsWriteAccess();
    const parsed = registerPaymentSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getPaymentsDb();
    const player = await getPlayerById(db, parsed.data.player_id);
    if (!player) return { ok: false, error: "Jugador no encontrado" };

    const exempt = await listExemptPlayerIds(createServiceRoleClient(), getCurrentSeason());
    if (exempt.has(player.id)) return { ok: false, error: EXEMPT_PLAYER_ERROR };

    const payment = await createPayment(db, {
      player_id: parsed.data.player_id,
      // Migración 20260925120000: nuevas filas deben rellenar user_id cuando el
      // jugador tiene cuenta vinculada (players.user_id).
      user_id: player.user_id ?? null,
      concept: parsed.data.concept,
      amount: parsed.data.amount,
      paid_date: parsed.data.paid_date,
      method: parsed.data.method,
      notes: parsed.data.notes,
      season: getCurrentSeason(),
      fee_code: parsed.data.fee_code ?? null,
      billing_month: parsed.data.fee_code ? (parsed.data.billing_month ?? null) : null,
    });

    invalidatePayments();
    return { ok: true, id: payment.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

/** Registra el mismo concepto/fecha/método para varios jugadores, con el importe de cada uno. */
export async function registerBulkPaymentsAction(input: unknown): Promise<BulkActionResult> {
  try {
    await requirePaymentsWriteAccess();
    const parsed = registerBulkPaymentsSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getPaymentsDb();
    const amountByPlayer = new Map(
      parsed.data.entries.map((entry) => [entry.player_id, entry.amount]),
    );
    const players = await listPlayerUserIds(db, [...amountByPlayer.keys()]);
    if (players.length === 0) return { ok: false, error: "Jugadores no encontrados" };

    const season = getCurrentSeason();
    const exempt = await listExemptPlayerIds(createServiceRoleClient(), season);
    const exemptCount = players.filter((player) => exempt.has(player.id)).length;
    if (exemptCount > 0) {
      return {
        ok: false,
        error:
          exemptCount === 1
            ? EXEMPT_PLAYER_ERROR
            : `${exemptCount} jugadores están exentos de pagos esta temporada. Quita la exención en su ficha o no los incluyas.`,
      };
    }
    const feeCode = parsed.data.fee_code ?? null;
    const payments = await createPayments(
      db,
      players.map((player) => ({
        player_id: player.id,
        user_id: player.user_id ?? null,
        concept: parsed.data.concept,
        amount: amountByPlayer.get(player.id) ?? 0,
        paid_date: parsed.data.paid_date,
        method: parsed.data.method,
        notes: parsed.data.notes,
        season,
        fee_code: feeCode,
        billing_month: feeCode ? (parsed.data.billing_month ?? null) : null,
      })),
    );

    invalidatePayments();
    return { ok: true, created: payments.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}
