import { notFound } from "next/navigation";

import { OrderForm } from "@/components/clothing/OrderForm";
import { OrderJourney } from "@/components/clothing/OrderJourney";
import { OrderLinesPanel } from "@/components/clothing/OrderLinesPanel";
import { OrderPlannedDeliveriesPanel } from "@/components/clothing/OrderPlannedDeliveriesPanel";
import { OrderDetailsPanel, OrderNextStepCard } from "@/components/clothing/OrderRail";
import { OrderStatusActions } from "@/components/clothing/OrderStatusActions";
import { OrderStatusBadge } from "@/components/clothing/OrderStatusBadge";
import { OrderStockPanel } from "@/components/clothing/OrderStockPanel";
import { OrderTabs, type OrderTab } from "@/components/clothing/OrderTabs";
import { DashboardPage } from "@/components/layout/DashboardPage";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requireClothingReadAccess } from "@/lib/clothing/auth";
import { buildOrderNextStep } from "@/lib/clothing/orderNextStep";
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
  const receivingEditable = order.status === "ordered" || order.status === "received";
  const plannedPending = planned.filter((row) => row.delivered_at === null).length;
  const nextStep = buildOrderNextStep({
    orderId: order.id,
    status: order.status,
    lines: order.lines,
    lots: orderLots,
    plannedCount: planned.length,
  });

  const tabs: OrderTab[] = [
    {
      id: "lineas",
      label: "Líneas",
      count: order.lines.length,
      content: <OrderLinesPanel lines={order.lines} editable={receivingEditable} />,
    },
  ];
  if (order.status !== "closed" || planned.length > 0) {
    tabs.push({
      id: "entregas-previstas",
      label: "Entregas previstas",
      count: plannedPending,
      content: (
        <OrderPlannedDeliveriesPanel
          orderId={order.id}
          lines={order.lines}
          planned={planned}
          players={players}
          editable={order.status !== "closed"}
        />
      ),
    });
  }
  if (orderLots.length > 0 || order.status === "returned_from_serigraphy") {
    tabs.push({
      id: "stock",
      label: "Stock",
      count: orderLots.length,
      content: <OrderStockPanel orderId={order.id} lots={orderLots} />,
    });
  }
  const defaultTab =
    order.status === "returned_from_serigraphy" || order.status === "closed"
      ? "stock"
      : "lineas";

  return (
    <DashboardPage
      title={order.reference}
      subtitle={
        <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span>
            {order.supplier_name} · Temporada {order.season}
          </span>
          <OrderStatusBadge status={order.status} />
        </span>
      }
      className="ord-page"
    >
      <section className="ord-bar ord-panel" aria-label="Estado y acciones del pedido">
        <OrderJourney status={order.status} events={order.status_events} />
        <div className="ord-bar__actions">
          <OrderStatusActions
            orderId={order.id}
            reference={order.reference}
            status={order.status}
            missingUnits={nextStep.missingUnits}
            missingSizes={nextStep.missingSizes}
            stockBlocker={nextStep.stockBlocker}
            leadAction={nextStep.leadAction}
          />
        </div>
      </section>

      <div className="ord-rail">
        <OrderNextStepCard nextStep={nextStep} />
        <OrderDetailsPanel
          status={order.status}
          updatedAt={order.updated_at}
          notes={order.notes}
          events={order.status_events}
          lines={order.lines}
          planned={planned}
          lots={orderLots}
        />
      </div>

      <div className="ord-main ord-panel">
        {isDraft ? (
          <div className="ord-main__body">
            <OrderForm products={products} order={order} players={players} planned={planned} />
          </div>
        ) : (
          <OrderTabs key={order.status} tabs={tabs} defaultTab={defaultTab} />
        )}
      </div>
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
