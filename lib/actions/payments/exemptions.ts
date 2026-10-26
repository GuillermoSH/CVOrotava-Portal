"use server";

import { invalidatePayments } from "@/lib/cache/invalidate";
import { requireRosterAdminAccess } from "@/lib/roster/auth";
import { removeExemption, setExemption } from "@/lib/payments/repository/exemptions";
import { removeExemptionSchema, setExemptionSchema } from "@/lib/payments/schemas";
import { getRosterDb } from "@/lib/roster/repository/client";
import { getPlayerById } from "@/lib/roster/repository/players";
import { getCurrentSeason } from "@/lib/season";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type ExemptionActionResult = { ok: true } | { ok: false; error: string };

/** La exención es de la temporada del jugador (cada temporada tiene su propia ficha). */
async function loadPlayerSeason(playerId: string): Promise<string | null> {
  const player = await getPlayerById(await getRosterDb(), playerId);
  if (!player) return null;
  return player.season ?? getCurrentSeason();
}

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

/** Marca (o actualiza el motivo de) la exención de pagos de un jugador. Solo admin. */
export async function setPlayerExemptionAction(input: unknown): Promise<ExemptionActionResult> {
  try {
    await requireRosterAdminAccess();
    const parsed = setExemptionSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const season = await loadPlayerSeason(parsed.data.player_id);
    if (!season) return { ok: false, error: "Jugador no encontrado" };

    await setExemption(createServiceRoleClient(), {
      playerId: parsed.data.player_id,
      season,
      reason: parsed.data.reason,
      createdBy: await currentUserId(),
    });
    invalidatePayments();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

/** Quita la exención: el jugador vuelve a la matriz y puede recibir cobros. Solo admin. */
export async function removePlayerExemptionAction(input: unknown): Promise<ExemptionActionResult> {
  try {
    await requireRosterAdminAccess();
    const parsed = removeExemptionSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const season = await loadPlayerSeason(parsed.data.player_id);
    if (!season) return { ok: false, error: "Jugador no encontrado" };

    await removeExemption(createServiceRoleClient(), parsed.data.player_id, season);
    invalidatePayments();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}
