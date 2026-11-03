import Link from "next/link";

import { buttonClassName } from "@/components/club/Button";
import { HomeDebtors } from "@/components/dashboard/HomeDebtors";
import { HomeKpiStrip } from "@/components/dashboard/HomeKpiStrip";
import { HomePending } from "@/components/dashboard/HomePending";
import { HomeRecentPayments } from "@/components/dashboard/HomeRecentPayments";
import { SeasonMonthChart } from "@/components/dashboard/SeasonMonthChart";
import { DashboardPage } from "@/components/layout/DashboardPage";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requirePortalRole } from "@/lib/auth/portal-access";
import { appRoutes } from "@/lib/constants";
import { getClothingHubKpis } from "@/lib/clothing/snapshots";
import { buildPendingGroups, summarizeRoster } from "@/lib/dashboard/pending";
import { getCachedSeasonFeeLines } from "@/lib/payments/cached-fees";
import {
  getCachedExemptPlayerIds,
  getCachedPaymentPlayers,
  getCachedSeasonPaymentFacts,
} from "@/lib/payments/cached-payments";
import { buildPaymentsDashboard } from "@/lib/payments/dashboard-stats";
import { buildPlayerFeeRows } from "@/lib/payments/player-fee-rows";
import { getRosterSnapshot } from "@/lib/roster/snapshots";
import { getCurrentSeason } from "@/lib/season";
import { formatEur } from "@/lib/format/currency";


/** Mismo cálculo que /admin/pagos: tarifa de la temporada − cobros anotados. */
async function loadPaymentsDashboard(today: Date) {
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
  return buildPaymentsDashboard({ rows, lines, today });
}

async function AdminDashboardContent() {
  const role = await requirePortalRole();
  const canSeePayments = role === "admin" || role === "manager";
  const today = new Date();

  const [clothingKpis, payments, roster] = await Promise.all([
    getClothingHubKpis(),
    canSeePayments ? loadPaymentsDashboard(today) : null,
    getRosterSnapshot(),
  ]);

  const rosterSummary = summarizeRoster(roster.players);
  const groups = buildPendingGroups({
    players: roster.players,
    payments,
    clothing: {
      openOrders: clothingKpis.openOrders,
      pendingStorageLots: clothingKpis.pendingStorageLots,
      pendingStorageUnits: clothingKpis.pendingStorageUnits,
    },
  });

  // La línea bajo el título es lo más importante de hoy, no una descripción de la pantalla.
  const headline = [
    payments && payments.overduePlayers > 0
      ? `${payments.overduePlayers} jugadores deben ${formatEur(payments.overdueTotal)} vencidos`
      : null,
    rosterSummary.incomplete > 0 ? `${rosterSummary.incomplete} altas por completar` : null,
    clothingKpis.openOrders > 0
      ? `${clothingKpis.openOrders} ${clothingKpis.openOrders === 1 ? "pedido de ropa abierto" : "pedidos de ropa abiertos"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <DashboardPage
      subtitle={headline || "Todo al día."}
      actions={
        canSeePayments ? (
          <Link href={appRoutes.payments.list} className={buttonClassName({ variant: "primary" })}>
            Registrar pago
          </Link>
        ) : null
      }
    >
      <div className="flex flex-col gap-8">
        <HomeKpiStrip
          payments={payments}
          roster={rosterSummary}
          clothing={{
            storedUnits: clothingKpis.storedUnits,
            pendingStorageUnits: clothingKpis.pendingStorageUnits,
            openOrders: clothingKpis.openOrders,
          }}
        />

        <div
          className={
            payments
              ? "grid gap-x-10 gap-y-8 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start"
              : "grid gap-8"
          }
        >
          <div className="flex min-w-0 flex-col gap-8">
            <HomePending groups={groups} />
            {payments ? (
              <>
                <SeasonMonthChart months={payments.byMonth} currentMonth={today.getMonth() + 1} />
                <HomeDebtors debtors={payments.debtors} />
              </>
            ) : null}
          </div>
          {payments ? (
            <aside className="flex flex-col gap-8">
              <HomeRecentPayments payments={payments.recent} />
            </aside>
          ) : null}
        </div>
      </div>
    </DashboardPage>
  );
}

export default function AdminDashboardPage() {
  return (
    <RuntimePage kind="admin">
      <AdminDashboardContent />
    </RuntimePage>
  );
}
