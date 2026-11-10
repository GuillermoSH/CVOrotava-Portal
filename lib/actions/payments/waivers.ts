"use server";

import { invalidatePayments } from "@/lib/cache/invalidate";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { obligationKey } from "@/lib/payments/fees";
import { loadSeasonFeeData } from "@/lib/payments/load";
import { removeWaiver, setWaiver } from "@/lib/payments/repository/waivers";
import { removeWaiverSchema, setWaiverSchema } from "@/lib/payments/schemas";
import { getCurrentSeason } from "@/lib/season";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type WaiverActionResult = { ok: true } | { ok: false; error: string };

async function currentUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * No cobrar lo pendiente de un concepto/mes: anota una anulación (aditiva, reversible) que se
 * resta de lo que debe el jugador. No toca ningún cobro. Admin y manager, como los cobros.
 * El importe no puede pasar de lo que falta (más lo ya anulado, si se corrige la anulación).
 */
export async function setPaymentWaiverAction(input: unknown): Promise<WaiverActionResult> {
  try {
    await requirePaymentsWriteAccess();
    const parsed = setWaiverSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    const { player_id, fee_code, billing_month, amount, reason } = parsed.data;

    const { rows } = await loadSeasonFeeData(new Date());
    const row = rows.find((r) => r.id === player_id);
    if (!row) return { ok: false, error: "Jugador no encontrado" };
    const obligation = row.obligations.find(
      (o) => o.key === obligationKey(fee_code, billing_month === 0 ? null : billing_month),
    );
    if (!obligation) return { ok: false, error: "Ese concepto no aplica a este jugador" };

    // Lo anulable es lo que falta más lo que ya estaba anulado (para poder corregir el importe).
    const waivable = Math.round((obligation.remaining + obligation.waived) * 100) / 100;
    if (waivable <= 0) return { ok: false, error: "No queda nada pendiente que anular" };
    if (amount > waivable + 0.005) {
      return { ok: false, error: `Solo se puede anular hasta ${waivable} € de este concepto` };
    }

    await setWaiver(createServiceRoleClient(), {
      playerId: player_id,
      season: getCurrentSeason(),
      feeCode: fee_code,
      billingMonth: billing_month,
      amount,
      reason,
      createdBy: await currentUserId(),
    });
    invalidatePayments();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

/** Volver a cobrar: quita la anulación y lo que faltaba vuelve a figurar como pendiente. */
export async function removePaymentWaiverAction(input: unknown): Promise<WaiverActionResult> {
  try {
    await requirePaymentsWriteAccess();
    const parsed = removeWaiverSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    await removeWaiver(createServiceRoleClient(), {
      playerId: parsed.data.player_id,
      season: getCurrentSeason(),
      feeCode: parsed.data.fee_code,
      billingMonth: parsed.data.billing_month,
    });
    invalidatePayments();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}
