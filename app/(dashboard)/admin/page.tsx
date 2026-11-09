import Link from "next/link";

import { buttonClassName } from "@/components/club/Button";
import { HomeKpiStrip } from "@/components/dashboard/HomeKpiStrip";
import { HomePending } from "@/components/dashboard/HomePending";
import { DashboardPage } from "@/components/layout/DashboardPage";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requirePortalRole } from "@/lib/auth/portal-access";
import { appRoutes } from "@/lib/constants";
import { getClothingHubKpis } from "@/lib/clothing/snapshots";
import { buildPendingGroups, summarizeRoster } from "@/lib/dashboard/pending";
import { loadPaymentsDashboard } from "@/lib/payments/load";
import { getRosterSnapshot } from "@/lib/roster/snapshots";

/**
 * Inicio: solo lo pendiente en toda la app. El control del dinero (cifras, gráficos, cobros) vive
 * en /admin/pagos/control; aquí los pagos entran únicamente como filas de «Por hacer».
 */
async function AdminDashboardContent() {
  const role = await requirePortalRole();
  const canSeePayments = role === "admin" || role === "manager";

  const [clothingKpis, payments, roster] = await Promise.all([
    getClothingHubKpis(),
    canSeePayments ? loadPaymentsDashboard(new Date()) : null,
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
      ? `${payments.overduePlayers} jugadores con pagos vencidos`
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
          <>
            <Link href={appRoutes.payments.control} className={buttonClassName({ variant: "secondary" })}>
              Control económico
            </Link>
            <Link href={appRoutes.payments.list} className={buttonClassName({ variant: "primary" })}>
              Registrar pago
            </Link>
          </>
        ) : null
      }
    >
      <div className="flex flex-col gap-8">
        <HomeKpiStrip
          payments={null}
          roster={rosterSummary}
          clothing={{
            storedUnits: clothingKpis.storedUnits,
            pendingStorageUnits: clothingKpis.pendingStorageUnits,
            openOrders: clothingKpis.openOrders,
          }}
        />
        <HomePending groups={groups} startTurn={4} />
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
