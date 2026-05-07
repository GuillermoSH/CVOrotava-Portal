import { ClothingReservationsCard } from "@/components/dashboard/ClothingReservationsCard";
import { CriticalDebtorsCard } from "@/components/dashboard/CriticalDebtorsCard";
import { MonthlyPaymentsCard } from "@/components/dashboard/MonthlyPaymentsCard";
import { PaymentsSummaryCard } from "@/components/dashboard/PaymentsSummaryCard";
import { RecentPaymentsCard } from "@/components/dashboard/RecentPaymentsCard";
import { adminKpis, criticalDebtors, recentPayments } from "@/lib/mocks/admin";

export default function AdminDashboardPage() {
  const emailConfigured = Boolean(process.env.RESEND_API_KEY);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Resumen del club
        </h2>
        <p className="text-sm text-muted-foreground">
          Datos ficticios — pendiente conectar Supabase.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ClothingReservationsCard {...adminKpis.clothing} />
        <CriticalDebtorsCard
          debtors={criticalDebtors}
          emailConfigured={emailConfigured}
        />
        <MonthlyPaymentsCard
          paid={adminKpis.monthlyPayments.paid}
          target={adminKpis.monthlyPayments.target}
        />
      </div>
      <PaymentsSummaryCard
        yearTotal={adminKpis.totalRevenueYear}
        monthTotal={adminKpis.revenueThisMonth}
        clothingExpected={adminKpis.clothingExpectedRevenue}
      />
      <RecentPaymentsCard payments={recentPayments} />
    </div>
  );
}
