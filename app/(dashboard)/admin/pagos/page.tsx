import { PlayersPaymentsPageClient } from "@/components/payments/PlayersPaymentsPageClient";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { getCachedSeasonFeeLines } from "@/lib/payments/cached-fees";
import { buildPlayerFeeRows } from "@/lib/payments/player-fee-rows";
import {
  getCachedPaymentPlayers,
  getCachedSeasonPaymentFacts,
} from "@/lib/payments/cached-payments";
import { getCurrentSeason } from "@/lib/season";

async function PaymentsContent() {
  await requirePaymentsWriteAccess();

  const season = getCurrentSeason();
  const [players, lines, paymentEntries] = await Promise.all([
    getCachedPaymentPlayers(season),
    getCachedSeasonFeeLines(season),
    getCachedSeasonPaymentFacts(season),
  ]);
  const paymentsByPlayer = new Map(paymentEntries);

  const rows = buildPlayerFeeRows({
    players,
    lines,
    paymentsByPlayer,
    season,
    today: new Date(),
  });

  return <PlayersPaymentsPageClient rows={rows} season={season} hasFees={lines.length > 0} />;
}

export default function PaymentsPage() {
  return (
    <RuntimePage kind="products">
      <PaymentsContent />
    </RuntimePage>
  );
}
