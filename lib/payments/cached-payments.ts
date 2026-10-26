import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { paymentsTag, rosterSeasonTag } from "@/lib/cache/tags";
import type { PaymentPlayer } from "@/lib/payments/player-fee-rows";
import {
  listPlayerIdsWithPaidMatricula,
  listSeasonPaymentFacts,
  type SeasonPaymentFacts,
} from "@/lib/payments/repository/payments";
import { listExemptPlayerIds } from "@/lib/payments/repository/exemptions";
import { listPlayersForPayments } from "@/lib/payments/repository/players";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Lecturas de pagos cacheadas (sin cookies, service role; la auth va fuera).
 * `payments` es compartida con Team Manager: un cobro anotado allí aparece aquí en
 * unos minutos; los cobros del Portal invalidan el tag al instante (`invalidatePayments`).
 */

/**
 * player_ids con la matrícula resuelta (badge del listado de jugadores y de exportación):
 * pagada, o exento de pagos esa temporada (no debe figurar como «sin matrícula»).
 */
export async function getCachedPaidMatriculaIds(season: string): Promise<string[]> {
  "use cache";
  cacheTag(paymentsTag());
  cacheLife("minutes");

  const db = createServiceRoleClient();
  const [paid, exempt] = await Promise.all([
    listPlayerIdsWithPaidMatricula(db, season),
    listExemptPlayerIds(db, season),
  ]);
  return [...new Set([...paid, ...exempt])];
}

/** Exentos de pagos de la temporada. Cambian desde Team Manager también: caché corta. */
export async function getCachedExemptPlayerIds(season: string): Promise<string[]> {
  "use cache";
  cacheTag(paymentsTag());
  cacheLife("minutes");

  return [...(await listExemptPlayerIds(createServiceRoleClient(), season))];
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
