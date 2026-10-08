"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shirt } from "lucide-react";

import { Badge } from "@/components/club/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/club/Table";
import { Select } from "@/components/club/Select";
import { TableRowInteractive } from "@/components/club/TableRowInteractive";
import { ClothingFilterChips } from "@/components/clothing/ClothingFilterChips";
import { ClothingOrderCard } from "@/components/clothing/ClothingOrderCard";
import { OrderStatusBadge } from "@/components/clothing/OrderStatusBadge";
import { formatOrderLineSummary } from "@/lib/clothing/formatOrderLines";
import { ORDER_STATUS_LABELS } from "@/lib/clothing/constants";
import { appRoutes } from "@/lib/constants";
import type { ClothingOrderStatus, ClothingOrderWithLines } from "@/lib/types/db";

function formatOrderDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function OrdersEmptyState({
  statusFilter,
  searching,
  onResetFilter,
}: {
  statusFilter: ClothingOrderStatus | "all" | "open";
  searching: boolean;
  onResetFilter: () => void;
}) {
  const isFiltered = statusFilter !== "open" || searching;

  return (
    <div className="ropa-empty">
      <Shirt className="ropa-empty__icon" aria-hidden />
      <p className="ropa-empty__title">
        {searching
          ? "Ningún pedido coincide"
          : isFiltered
            ? "Ningún pedido con este filtro"
            : "No hay pedidos abiertos"}
      </p>
      <p className="ropa-empty__body">
        {searching
          ? "Prueba otra referencia, proveedor o prenda."
          : isFiltered
            ? "Prueba otro estado o muestra todos los pedidos."
            : "Crea un pedido a proveedor para iniciar el flujo de compra y serigrafía."}
      </p>
      <div className="clothing-toolbar mt-5 hidden md:flex md:justify-center">
        {isFiltered ? (
          <button type="button" onClick={onResetFilter} className="btn-secondary">
            Ver abiertos
          </button>
        ) : (
          <Link href={appRoutes.clothing.newOrder} className="btn-primary">
            Nuevo pedido
          </Link>
        )}
      </div>
    </div>
  );
}

type OrderStatusFilter = ClothingOrderStatus | "all" | "open";

const QUICK_FILTERS: { value: OrderStatusFilter; label: string }[] = [
  { value: "open", label: "Abiertos" },
  { value: "all", label: "Todos" },
];

/** Orden operativo: recibidos / serigrafía primero. */
const STATUS_FILTERS: ClothingOrderStatus[] = [
  "received",
  "at_serigraphy",
  "draft",
  "ordered",
  "returned_from_serigraphy",
  "closed",
];

const STATUS_FILTER_OPTIONS = STATUS_FILTERS.map((value) => ({
  value,
  label: ORDER_STATUS_LABELS[value],
}));

export function OrderListView({
  orders,
  statusFilter,
  onStatusFilterChange,
  query = "",
}: {
  orders: ClothingOrderWithLines[];
  statusFilter: ClothingOrderStatus | "all" | "open";
  onStatusFilterChange: (value: ClothingOrderStatus | "all" | "open") => void;
  query?: string;
}) {
  const router = useRouter();
  const searching = query.trim().length > 0;
  const filtered = orders.filter((order) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "open") return order.status !== "closed";
    return order.status === statusFilter;
  });

  const specificStatus = QUICK_FILTERS.some((f) => f.value === statusFilter) ? "" : statusFilter;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <ClothingFilterChips
          options={QUICK_FILTERS}
          value={statusFilter}
          onChange={onStatusFilterChange}
          ariaLabel="Filtrar pedidos"
          className="shrink-0"
        />
        <Select
          value={specificStatus}
          onChange={(value) => onStatusFilterChange(value as ClothingOrderStatus)}
          options={STATUS_FILTER_OPTIONS}
          placeholder="Por estado"
          size="compact"
          className="min-w-0 flex-1 sm:max-w-48"
        />
      </div>

      {filtered.length === 0 ? (
        <OrdersEmptyState
          statusFilter={statusFilter}
          searching={searching}
          onResetFilter={() => onStatusFilterChange("open")}
        />
      ) : (
        <>
          <div className="flex flex-col gap-2.5 md:hidden">
            {filtered.map((order) => (
              <ClothingOrderCard key={order.id} order={order} />
            ))}
          </div>

          <div className="hidden md:block">
            <div className="glass-panel overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Contenido</TableHead>
                    <TableHead>Actualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((order) => (
                    <TableRowInteractive
                      key={order.id}
                      onActivate={() => router.push(appRoutes.clothing.orderDetail(order.id))}
                    >
                      <TableCell className="club-table__primary text-brand">
                        {order.reference}
                      </TableCell>
                      <TableCell>{order.supplier_name}</TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {order.lines.slice(0, 3).map((line) => (
                            <Badge key={line.id} variant="secondary" className="text-[11px]">
                              {formatOrderLineSummary(line)}
                            </Badge>
                          ))}
                          {order.lines.length > 3 ? (
                            <Badge variant="secondary" className="text-[11px]">
                              +{order.lines.length - 3}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatOrderDate(order.updated_at)}
                      </TableCell>
                    </TableRowInteractive>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
