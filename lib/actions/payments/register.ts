"use server";

import { revalidatePath } from "next/cache";

import { appRoutes } from "@/lib/constants";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { getPaymentsDb } from "@/lib/payments/repository/client";
import { createPayment } from "@/lib/payments/repository/payments";
import { registerPaymentSchema } from "@/lib/payments/schemas";
import { getPlayerById } from "@/lib/roster/repository/players";
import { getCurrentSeason } from "@/lib/season";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

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
    });

    revalidatePath(appRoutes.payments.list, "layout");
    return { ok: true, id: payment.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}
