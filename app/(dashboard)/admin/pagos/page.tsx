import { PlayersPaymentsPageClient } from "@/components/payments/PlayersPaymentsPageClient";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { getCachedSeasonFeeLines } from "@/lib/payments/cached-fees";
import { buildPlayerFeeRows } from "@/lib/payments/player-fee-rows";
import { getPaymentsDb } from "@/lib/payments/repository/client";
import { listSeasonPaymentFacts } from "@/lib/payments/repository/payments";
import { listPlayersForPayments } from "@/lib/payments/repository/players";
import { getCurrentSeason } from "@/lib/season";

async function PaymentsContent() {
  await requirePaymentsWriteAccess();

  const season = getCurrentSeason();
  const db = await getPaymentsDb();
  const [players, lines, paymentsByPlayer] = await Promise.all([
    listPlayersForPayments(db, season),
    getCachedSeasonFeeLines(season),
    listSeasonPaymentFacts(db, season),
  ]);

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
