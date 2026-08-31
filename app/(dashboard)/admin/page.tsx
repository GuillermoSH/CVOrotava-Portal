import { ClothingReservationsCard } from "@/components/dashboard/ClothingReservationsCard";
import { CriticalDebtorsCard } from "@/components/dashboard/CriticalDebtorsCard";
import { MonthlyPaymentsCard } from "@/components/dashboard/MonthlyPaymentsCard";
import { PaymentsSummaryCard } from "@/components/dashboard/PaymentsSummaryCard";
import { RecentPaymentsCard } from "@/components/dashboard/RecentPaymentsCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { getClothingHubKpis } from "@/lib/clothing/snapshots";
import { adminKpis, criticalDebtors, recentPayments } from "@/lib/mocks/admin";

export default async function AdminDashboardPage() {
  const emailConfigured = Boolean(process.env.RESEND_API_KEY);
  const clothingKpis = await getClothingHubKpis();
  const clothingTotal = clothingKpis.storedUnits + clothingKpis.pendingStorageUnits;

  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <PageHeader
        title="Resumen del club"
        subtitle="Vista general de pagos, morosidad e inventario de ropa. Datos ficticios hasta conectar Supabase."
      />

      <section>
        <h2 className="section-title mb-4">Indicadores</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ClothingReservationsCard
            total={clothingTotal}
            fulfilled={clothingKpis.storedUnits}
            pending={clothingKpis.pendingStorageUnits}
          />
          <CriticalDebtorsCard
            debtors={criticalDebtors}
            emailConfigured={emailConfigured}
          />
          <MonthlyPaymentsCard
            paid={adminKpis.monthlyPayments.paid}
            target={adminKpis.monthlyPayments.target}
          />
        </div>
      </section>

      <section>
        <PaymentsSummaryCard
          yearTotal={adminKpis.totalRevenueYear}
          monthTotal={adminKpis.revenueThisMonth}
          clothingExpected={adminKpis.clothingExpectedRevenue}
        />
      </section>

      <section>
        <RecentPaymentsCard payments={recentPayments} />
      </section>
    </div>
  );
}
