import { PlayersPaymentsPageClient } from "@/components/payments/PlayersPaymentsPageClient";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { getCachedSeasonFeeLines } from "@/lib/payments/cached-fees";
import { buildPlayerFeeRows } from "@/lib/payments/player-fee-rows";
import { getPaymentsDb } from "@/lib/payments/repository/client";
import { listSeasonPaymentFacts } from "@/lib/payments/repository/payments";
import { getRosterSnapshot } from "@/lib/roster/snapshots";

async function PaymentsContent() {
  await requirePaymentsWriteAccess();

  const [{ players, season }, db] = await Promise.all([getRosterSnapshot(), getPaymentsDb()]);
  const [lines, paymentsByPlayer] = await Promise.all([
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
