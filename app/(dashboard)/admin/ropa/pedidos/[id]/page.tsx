import { notFound } from "next/navigation";

import { OrderCockpit } from "@/components/clothing/OrderCockpit";
import { OrderForm } from "@/components/clothing/OrderForm";
import { OrderLinesSection } from "@/components/clothing/OrderLinesSection";
import { OrderPlannedDeliveriesPanel } from "@/components/clothing/OrderPlannedDeliveriesPanel";
import { OrderReceivingVerificationPanel } from "@/components/clothing/OrderReceivingVerificationPanel";
import { OrderStatusStepper } from "@/components/clothing/OrderStatusStepper";
import { DashboardPage } from "@/components/layout/DashboardPage";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requireClothingReadAccess } from "@/lib/clothing/auth";
import { getClothingDb } from "@/lib/clothing/repository/client";
import { listPlannedByOrder } from "@/lib/clothing/repository/plannedDeliveries";
import {
  enrichInventory,
  getOrderById,
  getProductsSnapshot,
  getRosterSnapshot,
} from "@/lib/clothing/snapshots";

async function ClothingOrderDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireClothingReadAccess();
  const { id } = await params;
  const [order, allLots, products, players, planned] = await Promise.all([
    getOrderById(id),
    enrichInventory(),
    getProductsSnapshot(),
    getRosterSnapshot(),
    getClothingDb().then((db) => listPlannedByOrder(db, id)),
  ]);
  if (!order) notFound();

  const isDraft = order.status === "draft";
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
      <section className="ropa-panel ropa-order-summary">
        <div className="ropa-panel__block ropa-order-summary__progress">
          <OrderStatusStepper
            currentStatus={order.status}
            statusEvents={order.status_events}
          />
          <time dateTime={order.updated_at} className="ropa-panel__meta ropa-order-summary__updated">
            Actualizado{" "}
            {new Date(order.updated_at).toLocaleString("es-ES", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>

        {!isDraft && order.notes ? (
          <p className="ropa-panel__notes">{order.notes}</p>
        ) : null}

        <div className="ropa-panel__block ropa-panel__block--flush">
          <OrderCockpit
            orderId={order.id}
            status={order.status}
            lines={order.lines}
            orderLots={orderLots}
            plannedCount={planned.length}
          />
        </div>
      </section>

      {isDraft ? (
        <section className="flex flex-col gap-3">
          <h2 className="ropa-section-heading">Editar borrador</h2>
          <p className="text-sm text-muted-foreground">
            Puedes cambiar proveedor, notas y líneas mientras el pedido siga en borrador.
            Al marcarlo como enviado, el contenido quedará bloqueado.
          </p>
          <OrderForm products={products} order={order} players={players} planned={planned} />
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          {showVerification ? (
            <OrderReceivingVerificationPanel
              lines={order.lines}
              editable={verificationEditable}
            />
          ) : (
            <>
              <h2 className="ropa-section-heading md:hidden">Líneas del pedido</h2>
              <OrderLinesSection lines={order.lines} showReceived={false} />
            </>
          )}
        </section>
      )}

      {!isDraft ? (
        <OrderPlannedDeliveriesPanel
          orderId={order.id}
          lines={order.lines}
          planned={planned}
          players={players}
          editable={order.status !== "closed"}
        />
      ) : null}
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
