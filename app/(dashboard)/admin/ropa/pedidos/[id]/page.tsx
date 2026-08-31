import { notFound } from "next/navigation";

import { OrderLinesSection } from "@/components/clothing/OrderLinesSection";
import { OrderStatusActions } from "@/components/clothing/OrderStatusActions";
import { OrderStatusBadge } from "@/components/clothing/OrderStatusBadge";
import { OrderStatusStepper } from "@/components/clothing/OrderStatusStepper";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireClothingReadAccess } from "@/lib/clothing/auth";
import { getOrderById } from "@/lib/clothing/snapshots";
import { appRoutes } from "@/lib/constants";

export default async function ClothingOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireClothingReadAccess();
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <div className="clothing-page-with-sticky flex flex-col gap-6">
      <PageHeader
        back={{ href: appRoutes.clothing.orders, label: "Pedidos" }}
        title={order.reference}
        subtitle={`${order.supplier_name} · Temporada ${order.season}`}
      />

      <div className="glass-panel gap-0 !p-0">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-4 sm:px-5 sm:py-5">
          <OrderStatusBadge status={order.status} />
          <time
            dateTime={order.updated_at}
            className="text-xs text-muted-foreground sm:text-sm"
          >
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
          <p className="border-t border-[var(--club-border)] px-4 py-3 text-sm text-muted-foreground sm:px-5">
            {order.notes}
          </p>
        ) : null}

        <div className="border-t border-[var(--club-border)] px-4 py-4 sm:px-5 sm:py-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Progreso
          </p>
          <OrderStatusStepper currentStatus={order.status} />
        </div>

        <div className="border-t border-[var(--club-border)] px-4 py-4 sm:px-5 sm:py-5">
          <OrderStatusActions orderId={order.id} status={order.status} />
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="section-title md:hidden">Líneas del pedido</h2>
        <OrderLinesSection lines={order.lines} />
      </section>
    </div>
  );
}
