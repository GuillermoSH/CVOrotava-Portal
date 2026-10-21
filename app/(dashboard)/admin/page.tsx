import { ClothingReservationsCard } from "@/components/dashboard/ClothingReservationsCard";
import { CriticalDebtorsCard } from "@/components/dashboard/CriticalDebtorsCard";
import { MonthlyPaymentsCard } from "@/components/dashboard/MonthlyPaymentsCard";
import { PaymentsSummaryCard } from "@/components/dashboard/PaymentsSummaryCard";
import { RecentPaymentsCard } from "@/components/dashboard/RecentPaymentsCard";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requirePortalRole } from "@/lib/auth/portal-access";
import { getClothingHubKpis } from "@/lib/clothing/snapshots";
import { getCachedSeasonFeeLines } from "@/lib/payments/cached-fees";
import {
  getCachedPaymentPlayers,
  getCachedSeasonPaymentFacts,
} from "@/lib/payments/cached-payments";
import { buildPaymentsDashboard } from "@/lib/payments/dashboard-stats";
import { buildPlayerFeeRows } from "@/lib/payments/player-fee-rows";
import { getCurrentSeason } from "@/lib/season";

/** Mismo cálculo que /admin/pagos: tarifa de la temporada − cobros anotados. */
async function loadPaymentsDashboard() {
  const season = getCurrentSeason();
  const today = new Date();
  const [players, lines, paymentEntries] = await Promise.all([
    getCachedPaymentPlayers(season),
    getCachedSeasonFeeLines(season),
    getCachedSeasonPaymentFacts(season),
  ]);

  const rows = buildPlayerFeeRows({
    players,
    lines,
    paymentsByPlayer: new Map(paymentEntries),
    season,
    today,
  });
  return buildPaymentsDashboard({ rows, lines, today });
}

async function AdminDashboardContent() {
  const role = await requirePortalRole();
  const canSeePayments = role === "admin" || role === "manager";

  const [clothingKpis, payments] = await Promise.all([
    getClothingHubKpis(),
    canSeePayments ? loadPaymentsDashboard() : null,
  ]);
  const clothingTotal = clothingKpis.storedUnits + clothingKpis.pendingStorageUnits;

  return (
    <>
      <section>
        <h2 className="section-title mb-3">Indicadores</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ClothingReservationsCard
            total={clothingTotal}
            fulfilled={clothingKpis.storedUnits}
            pending={clothingKpis.pendingStorageUnits}
          />
          {payments && (
            <>
              <CriticalDebtorsCard debtors={payments.debtors} />
              <MonthlyPaymentsCard
                month={payments.monthly?.month ?? null}
                paid={payments.monthly?.paid ?? 0}
                target={payments.monthly?.target ?? 0}
              />
            </>
          )}
        </div>
      </section>

      {payments && (
        <>
          <section>
            <PaymentsSummaryCard
              seasonTotal={payments.seasonTotal}
              monthTotal={payments.monthTotal}
              overdueTotal={payments.overdueTotal}
              overduePlayers={payments.overduePlayers}
            />
          </section>

          <section>
            <RecentPaymentsCard payments={payments.recent} />
          </section>
        </>
      )}
    </>
  );
}

export default function AdminDashboardPage() {
  return (
    <RuntimePage kind="admin">
      <AdminDashboardContent />
    </RuntimePage>
  );
}
