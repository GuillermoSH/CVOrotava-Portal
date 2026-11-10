import "server-only";

import { getCachedSeasonFeeLines } from "@/lib/payments/cached-fees";
import {
  getCachedExemptPlayerIds,
  getCachedPaymentPlayers,
  getCachedSeasonPaymentFacts,
  getCachedSeasonWaivers,
} from "@/lib/payments/cached-payments";
import { buildPaymentsDashboard } from "@/lib/payments/dashboard-stats";
import { buildEconomicControl, type PaymentDetail } from "@/lib/payments/economic-control";
import { buildPlayerFeeRows } from "@/lib/payments/player-fee-rows";
import { getPaymentsDb } from "@/lib/payments/repository/client";
import { listPaymentDetails } from "@/lib/payments/repository/payments";
import { getCurrentSeason } from "@/lib/season";

/** Tarifa de la temporada − cobros anotados, por jugador: la base de todo el control económico. */
export async function loadSeasonFeeData(today: Date) {
  const season = getCurrentSeason(today);
  const [players, lines, paymentEntries, exemptIds, waiverEntries] = await Promise.all([
    getCachedPaymentPlayers(season),
    getCachedSeasonFeeLines(season),
    getCachedSeasonPaymentFacts(season),
    getCachedExemptPlayerIds(season),
    getCachedSeasonWaivers(season),
  ]);

  const rows = buildPlayerFeeRows({
    players,
    lines,
    paymentsByPlayer: new Map(paymentEntries),
    season,
    today,
    exemptPlayerIds: new Set(exemptIds),
    waiversByPlayer: new Map(waiverEntries),
  });
  return { season, lines, rows };
}

export async function loadPaymentsDashboard(today: Date) {
  const { lines, rows } = await loadSeasonFeeData(today);
  return buildPaymentsDashboard({ rows, lines, today });
}

/** Panel + detalle del control económico: lo calculado de la temporada y el dashboard de cifras. */
export async function loadEconomicControl(today: Date) {
  const { lines, rows } = await loadSeasonFeeData(today);
  return {
    control: buildEconomicControl({ rows, lines }),
    payments: buildPaymentsDashboard({ rows, lines, today }),
  };
}

/** Concepto escrito, notas y fecha de alta de los cobros indicados, por id. */
export async function loadPaymentDetailMap(ids: readonly string[]): Promise<Map<string, PaymentDetail>> {
  const details = await listPaymentDetails(await getPaymentsDb(), ids);
  return new Map(details.map((d) => [d.id, d]));
}
