"use client";

import Link from "next/link";
import { useState } from "react";

import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { OrderKanbanBoard } from "@/components/clothing/OrderKanbanBoard";
import { OrderListView } from "@/components/clothing/OrderListView";
import {
  OrdersViewToggle,
  useClothingOrdersView,
} from "@/components/clothing/OrdersViewToggle";
import { DashboardPage } from "@/components/layout/DashboardPage";
import { appRoutes } from "@/lib/constants";
import type { ClothingOrderStatus, ClothingOrderWithLines } from "@/lib/types/db";

export function OrdersPageClient({ orders }: { orders: ClothingOrderWithLines[] }) {
  const [view, setView] = useClothingOrdersView("list");
  const [statusFilter, setStatusFilter] = useState<ClothingOrderStatus | "all" | "open">("open");

  return (
    <DashboardPage
      actions={
        <div className="clothing-toolbar hidden md:flex">
          <OrdersViewToggle view={view} onChange={setView} />
          <Link href={appRoutes.clothing.newOrder} className="btn-primary">
            Nuevo pedido
          </Link>
        </div>
      }
    >
      {view === "kanban" ? (
        <OrderKanbanBoard orders={orders} />
      ) : (
        <OrderListView
          orders={orders}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      )}

      <ClothingStickyActionBar
        actions={[{ type: "link", label: "Nuevo pedido", href: appRoutes.clothing.newOrder }]}
      />
    </DashboardPage>
  );
}
