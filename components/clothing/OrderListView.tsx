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
import { TableRowInteractive } from "@/components/club/TableRowInteractive";
import { ClothingFilterChips } from "@/components/clothing/ClothingFilterChips";
import { ClothingOrderCard } from "@/components/clothing/ClothingOrderCard";
import { OrderStatusBadge } from "@/components/clothing/OrderStatusBadge";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { formatProductShort } from "@/lib/clothing/formatProduct";
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
  onResetFilter,
}: {
  statusFilter: ClothingOrderStatus | "all" | "open";
  onResetFilter: () => void;
}) {
  const isFiltered = statusFilter !== "open";

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--club-border)] px-6 py-10 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-[var(--club-brand-soft)] text-brand">
        <Shirt className="size-5" aria-hidden />
      </div>
      <p className="mt-4 font-medium text-foreground">
        {isFiltered ? "Ningún pedido con este filtro" : "No hay pedidos abiertos"}
      </p>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
        {isFiltered
          ? "Prueba otro estado o muestra todos los pedidos."
          : "Crea un pedido a proveedor para iniciar el flujo de compra y serigrafía."}
      </p>
      <div className="mt-5 hidden md:block">
          {isFiltered ? (
            <button type="button" onClick={onResetFilter} className="btn-secondary min-h-11">
              Ver abiertos
            </button>
          ) : (
            <Link href={appRoutes.clothing.newOrder} className="btn-primary min-h-11">
              Nuevo pedido
            </Link>
          )}
        </div>
    </div>
  );
}

export function OrderListView({
  orders,
  statusFilter,
  onStatusFilterChange,
}: {
  orders: ClothingOrderWithLines[];
  statusFilter: ClothingOrderStatus | "all" | "open";
  onStatusFilterChange: (value: ClothingOrderStatus | "all" | "open") => void;
}) {
  const router = useRouter();
  const filtered = orders.filter((order) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "open") return order.status !== "closed";
    return order.status === statusFilter;
  });

  const filterOptions: { value: ClothingOrderStatus | "all" | "open"; label: string }[] = [
    { value: "open", label: "Abiertos" },
    { value: "all", label: "Todos" },
    ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
      value: value as ClothingOrderStatus,
      label,
    })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <ClothingFilterChips
        options={filterOptions}
        value={statusFilter}
        onChange={onStatusFilterChange}
        ariaLabel="Filtrar pedidos por estado"
      />

      {filtered.length === 0 ? (
        <OrdersEmptyState
          statusFilter={statusFilter}
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
                  <TableHead>Líneas</TableHead>
                  <TableHead>Actualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => (
                  <TableRowInteractive
                    key={order.id}
                    onActivate={() => router.push(appRoutes.clothing.orderDetail(order.id))}
                  >
                    <TableCell className="club-table__primary text-brand">{order.reference}</TableCell>
                    <TableCell>{order.supplier_name}</TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {order.lines.slice(0, 3).map((line) => (
                          <Badge key={line.id} variant="secondary" className="text-[10px]">
                            {formatProductShort(line.product)} {formatClothingSize(line.size)}
                          </Badge>
                        ))}
                        {order.lines.length > 3 ? (
                          <Badge variant="secondary" className="text-[10px]">
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
