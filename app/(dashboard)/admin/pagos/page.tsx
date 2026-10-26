import { PlayersPaymentsPageClient } from "@/components/payments/PlayersPaymentsPageClient";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { getCachedSeasonFeeLines } from "@/lib/payments/cached-fees";
import { buildPlayerFeeRows } from "@/lib/payments/player-fee-rows";
import {
  getCachedExemptPlayerIds,
  getCachedPaymentPlayers,
  getCachedSeasonPaymentFacts,
} from "@/lib/payments/cached-payments";
import { getCurrentSeason } from "@/lib/season";

async function PaymentsContent() {
  await requirePaymentsWriteAccess();

  const season = getCurrentSeason();
  const [players, lines, paymentEntries, exemptIds] = await Promise.all([
    getCachedPaymentPlayers(season),
    getCachedSeasonFeeLines(season),
    getCachedSeasonPaymentFacts(season),
    getCachedExemptPlayerIds(season),
  ]);
  const paymentsByPlayer = new Map(paymentEntries);

  const rows = buildPlayerFeeRows({
    players,
    lines,
    paymentsByPlayer,
    season,
    today: new Date(),
    exemptPlayerIds: new Set(exemptIds),
  });

  // Los exentos no salen en la matriz ni en el registro de cobros; se gestionan en su ficha.
  const visibleRows = rows.filter((row) => !row.exempt);

  return <PlayersPaymentsPageClient rows={visibleRows} season={season} hasFees={lines.length > 0} />;
}

export default function PaymentsPage() {
  return (
    <RuntimePage kind="products">
      <PaymentsContent />
    </RuntimePage>
  );
}
