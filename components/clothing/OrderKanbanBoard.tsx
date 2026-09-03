"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { appToast } from "@/lib/toast";

import { Badge } from "@/components/club/Badge";
import {
  ClothingBottomSheet,
} from "@/components/clothing/ClothingBottomSheet";
import { updateOrderStatus } from "@/lib/actions/clothing/orders";
import {
  CLOTHING_KANBAN_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TRANSITIONS,
} from "@/lib/clothing/constants";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import { appRoutes } from "@/lib/constants";
import type { ClothingOrderStatus, ClothingOrderWithLines } from "@/lib/types/db";
import { cn } from "@/lib/utils";

function OrderCard({
  order,
  isDragging,
}: {
  order: ClothingOrderWithLines;
  isDragging?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--club-border)] bg-[var(--club-surface)] p-3 shadow-sm",
        isDragging && "opacity-70 shadow-md",
      )}
    >
      <Link
        href={appRoutes.clothing.orderDetail(order.id)}
        className="block font-medium text-foreground hover:text-brand"
        onClick={(e) => e.stopPropagation()}
      >
        {order.reference}
      </Link>
      <p className="mt-1 text-xs text-muted-foreground">{order.supplier_name}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {order.lines.length} línea{order.lines.length === 1 ? "" : "s"}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {order.lines.slice(0, 2).map((line) => (
          <Badge key={line.id} variant="secondary" className="text-[10px]">
            {formatProductShort(line.product)} {formatClothingSize(line.size)}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function DraggableOrderCard({ order }: { order: ClothingOrderWithLines }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn("cursor-grab touch-none", isDragging && "opacity-40")}
    >
      <OrderCard order={order} />
    </div>
  );
}

function KanbanColumn({
  status,
  orders,
}: {
  status: ClothingOrderStatus;
  orders: ClothingOrderWithLines[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const columnOrders = orders.filter((o) => o.status === status);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[240px] flex-1 flex-col rounded-xl border border-[var(--club-border)] bg-[var(--club-surface-2)]/40 transition-colors",
        isOver && "border-[var(--club-brand)] bg-[var(--club-brand-soft)]/20",
      )}
    >
      <div className="border-b border-[var(--club-border)] px-3 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {ORDER_STATUS_LABELS[status]}
        </h3>
        <p className="text-lg font-semibold tabular-nums text-foreground">{columnOrders.length}</p>
      </div>
      <div className="flex min-h-[120px] flex-col gap-2 p-2">
        {columnOrders.map((order) => (
          <DraggableOrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}

function resolveTargetStatus(
  overId: string,
  orders: ClothingOrderWithLines[],
): ClothingOrderStatus | null {
  if (CLOTHING_KANBAN_STATUSES.includes(overId as (typeof CLOTHING_KANBAN_STATUSES)[number])) {
    return overId as ClothingOrderStatus;
  }
  const overOrder = orders.find((o) => o.id === overId);
  return overOrder?.status ?? null;
}

export function OrderKanbanBoard({ orders }: { orders: ClothingOrderWithLines[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<{
    orderId: string;
    status: ClothingOrderStatus;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const openOrders = useMemo(
    () => orders.filter((o) => o.status !== "closed"),
    [orders],
  );

  const activeOrder = activeId ? openOrders.find((o) => o.id === activeId) : null;

  function applyStatus(orderId: string, targetStatus: ClothingOrderStatus) {
    startTransition(async () => {
      const result = await updateOrderStatus({ order_id: orderId, status: targetStatus });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success(`Movido a ${ORDER_STATUS_LABELS[targetStatus]}`);
      setConfirmStatus(null);
      router.refresh();
    });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || pending) return;

    const orderId = String(active.id);
    const targetStatus = resolveTargetStatus(String(over.id), openOrders);
    if (!targetStatus) return;

    const order = openOrders.find((o) => o.id === orderId);
    if (!order || order.status === targetStatus) return;

    const allowed = ORDER_STATUS_TRANSITIONS[order.status];
    if (!allowed.includes(targetStatus)) {
      appToast.error("Transición no permitida");
      return;
    }

    if (targetStatus === "returned_from_serigraphy") {
      setConfirmStatus({ orderId, status: targetStatus });
      return;
    }

    applyStatus(orderId, targetStatus);
  }

  return (
    <>
      <div className="hidden md:block">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {CLOTHING_KANBAN_STATUSES.map((status) => (
              <KanbanColumn key={status} status={status} orders={openOrders} />
            ))}
          </div>
          <DragOverlay>
            {activeOrder ? <OrderCard order={activeOrder} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      <ClothingBottomSheet
        open={confirmStatus !== null}
        onClose={() => setConfirmStatus(null)}
        title="Generar inventario"
        description="Se crearán lotes pendientes de ubicar en almacén."
        primaryAction={{
          label: "Continuar",
          pending,
          onClick: () => {
            if (!confirmStatus) return;
            applyStatus(confirmStatus.orderId, confirmStatus.status);
          },
        }}
        secondaryAction={{
          label: "Cancelar",
          onClick: () => setConfirmStatus(null),
        }}
      />
    </>
  );
}
