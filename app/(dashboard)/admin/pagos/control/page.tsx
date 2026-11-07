import { EconomicControlView } from "@/components/payments/EconomicControlView";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { getCachedSeasonFeeLines } from "@/lib/payments/cached-fees";
import {
  getCachedExemptPlayerIds,
  getCachedPaymentPlayers,
  getCachedSeasonPaymentFacts,
} from "@/lib/payments/cached-payments";
import { buildEconomicControl } from "@/lib/payments/economic-control";
import { buildPlayerFeeRows } from "@/lib/payments/player-fee-rows";
import { getCurrentSeason } from "@/lib/season";

async function ControlContent() {
  await requirePaymentsWriteAccess();

  const today = new Date();
  const season = getCurrentSeason(today);
  const [players, lines, paymentEntries, exemptIds] = await Promise.all([
    getCachedPaymentPlayers(season),
    getCachedSeasonFeeLines(season),
    getCachedSeasonPaymentFacts(season),
    getCachedExemptPlayerIds(season),
  ]);

  const rows = buildPlayerFeeRows({
    players,
    lines,
    paymentsByPlayer: new Map(paymentEntries),
    season,
    today,
    exemptPlayerIds: new Set(exemptIds),
  });

  return <EconomicControlView control={buildEconomicControl({ rows, lines })} />;
}

export default function EconomicControlPage() {
  return (
    <RuntimePage kind="products">
      <ControlContent />
    </RuntimePage>
  );
}
