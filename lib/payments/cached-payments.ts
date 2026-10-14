import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { paymentsTag, rosterSeasonTag } from "@/lib/cache/tags";
import type { PaymentPlayer } from "@/lib/payments/player-fee-rows";
import {
  listPlayerIdsWithPaidMatricula,
  listSeasonPaymentFacts,
  type SeasonPaymentFacts,
} from "@/lib/payments/repository/payments";
import { listPlayersForPayments } from "@/lib/payments/repository/players";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Lecturas de pagos cacheadas (sin cookies, service role; la auth va fuera).
 * `payments` es compartida con Team Manager: un cobro anotado allí aparece aquí en
 * unos minutos; los cobros del Portal invalidan el tag al instante (`invalidatePayments`).
 */

/** player_ids con la matrícula pagada (badge del listado de jugadores y de exportación). */
export async function getCachedPaidMatriculaIds(season: string): Promise<string[]> {
  "use cache";
  cacheTag(paymentsTag());
  cacheLife("minutes");

  const ids = await listPlayerIdsWithPaidMatricula(createServiceRoleClient(), season);
  return [...ids];
}

/** Cobros pagados de la temporada agrupados por jugador, como pares serializables. */
export async function getCachedSeasonPaymentFacts(
  season: string,
): Promise<[string, SeasonPaymentFacts[]][]> {
  "use cache";
  cacheTag(paymentsTag());
  cacheLife("minutes");

  const byPlayer = await listSeasonPaymentFacts(createServiceRoleClient(), season);
  return [...byPlayer.entries()];
}

/** Jugadores de la temporada con lo mínimo para calcular su tarifa. */
export async function getCachedPaymentPlayers(season: string): Promise<PaymentPlayer[]> {
  "use cache";
  cacheTag(rosterSeasonTag(season));
  cacheLife("hours");

  return listPlayersForPayments(createServiceRoleClient(), season);
}
