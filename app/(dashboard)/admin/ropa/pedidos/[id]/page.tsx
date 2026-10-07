import { notFound } from "next/navigation";

import { OrderCockpit } from "@/components/clothing/OrderCockpit";
import { OrderLinesSection } from "@/components/clothing/OrderLinesSection";
import { OrderReceivingVerificationPanel } from "@/components/clothing/OrderReceivingVerificationPanel";
import { OrderStatusBadge } from "@/components/clothing/OrderStatusBadge";
import { OrderStatusStepper } from "@/components/clothing/OrderStatusStepper";
import { DashboardPage } from "@/components/layout/DashboardPage";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requireClothingReadAccess } from "@/lib/clothing/auth";
import { enrichInventory, getOrderById } from "@/lib/clothing/snapshots";

async function ClothingOrderDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireClothingReadAccess();
  const { id } = await params;
  const [order, allLots] = await Promise.all([getOrderById(id), enrichInventory()]);
  if (!order) notFound();

  const orderLots = allLots.filter((lot) => lot.source_order_id === order.id);
  const showVerification =
    order.status === "ordered" ||
    order.status === "received" ||
    order.status === "at_serigraphy" ||
    order.status === "returned_from_serigraphy" ||
    order.status === "closed";
  const verificationEditable =
    order.status === "ordered" || order.status === "received";

  return (
    <DashboardPage
      title={order.reference}
      subtitle={`${order.supplier_name} · Temporada ${order.season}`}
      className="flex flex-col gap-5 md:gap-6"
    >
      <section className="ropa-panel">
        <div className="ropa-panel__bar">
          <OrderStatusBadge status={order.status} />
          <time dateTime={order.updated_at} className="ropa-panel__meta">
            Actualizado{" "}
            {new Date(order.updated_at).toLocaleString("es-ES", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>

        {order.notes ? (
          <p className="ropa-panel__notes">{order.notes}</p>
        ) : null}

        <div className="ropa-panel__block">
          <h2 className="ropa-section-label">Sets</h2>
          <OrderStatusStepper
            currentStatus={order.status}
            statusEvents={order.status_events}
          />
        </div>

        <div className="ropa-panel__block ropa-panel__block--flush">
          <OrderCockpit
            orderId={order.id}
            status={order.status}
            lines={order.lines}
            orderLots={orderLots}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        {showVerification ? (
          <OrderReceivingVerificationPanel
            lines={order.lines}
            editable={verificationEditable}
          />
        ) : (
          <>
            <h2 className="ropa-section-heading md:hidden">Líneas del pedido</h2>
            <OrderLinesSection lines={order.lines} />
          </>
        )}
      </section>
    </DashboardPage>
  );
}

export default function ClothingOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <RuntimePage kind="order-detail">
      <ClothingOrderDetailContent params={params} />
    </RuntimePage>
  );
}
