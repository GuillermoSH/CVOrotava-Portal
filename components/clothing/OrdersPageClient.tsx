"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Input } from "@/components/club/Input";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { OrderKanbanBoard } from "@/components/clothing/OrderKanbanBoard";
import { OrderListView } from "@/components/clothing/OrderListView";
import {
  OrdersViewToggle,
  useClothingOrdersView,
} from "@/components/clothing/OrdersViewToggle";
import { DashboardPage } from "@/components/layout/DashboardPage";
import { orderMatchesQuery } from "@/lib/clothing/formatOrderLines";
import { appRoutes } from "@/lib/constants";
import type { ClothingOrderStatus, ClothingOrderWithLines } from "@/lib/types/db";

export function OrdersPageClient({
  orders,
  initialQuery = "",
}: {
  orders: ClothingOrderWithLines[];
  initialQuery?: string;
}) {
  const [view, setView] = useClothingOrdersView("list");
  const [statusFilter, setStatusFilter] = useState<ClothingOrderStatus | "all" | "open">("open");
  const [query, setQuery] = useState(initialQuery);

  const searchedOrders = useMemo(
    () => orders.filter((order) => orderMatchesQuery(order, query)),
    [orders, query],
  );

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
      <div className="mb-3">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar referencia, proveedor o prenda"
          aria-label="Buscar pedidos"
          className="min-h-11"
        />
      </div>

      {view === "kanban" ? (
        <OrderKanbanBoard orders={searchedOrders} />
      ) : (
        <OrderListView
          orders={searchedOrders}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          query={query}
        />
      )}

      <ClothingStickyActionBar
        actions={[{ type: "link", label: "Nuevo pedido", href: appRoutes.clothing.newOrder }]}
      />
    </DashboardPage>
  );
}
