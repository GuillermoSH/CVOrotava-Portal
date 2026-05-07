import { MonthlyPaymentsCard } from "@/components/dashboard/MonthlyPaymentsCard";
import { PaymentsSummaryCard } from "@/components/dashboard/PaymentsSummaryCard";
import { RecentPaymentsCard } from "@/components/dashboard/RecentPaymentsCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { adminKpis, recentPayments } from "@/lib/mocks/admin";

export default function AdminDashboardPage() {
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
        <StatCard
          label="Reservas ropa pendientes"
          value={adminKpis.clothingPending}
          helper="Por confirmar"
        />
        <StatCard
          label="Morosos críticos"
          value={adminKpis.criticalDebtors}
          helper="≥ 2 cuotas"
          accent="warning"
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
