import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { paymentFeesTag } from "@/lib/cache/tags";
import { listSeasonFeeLines } from "@/lib/payments/repository/fees";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { SeasonFeeLine } from "@/lib/types/db";

/**
 * Tarifa de una temporada. Cacheado sin cookies (service role); auth fuera.
 * Se invalida con `invalidatePaymentFees` al guardar cualquier línea.
 */
export async function getCachedSeasonFeeLines(season: string): Promise<SeasonFeeLine[]> {
  "use cache";
  cacheTag(paymentFeesTag());
  cacheLife("hours");

  const db = createServiceRoleClient();
  return listSeasonFeeLines(db, season);
}
