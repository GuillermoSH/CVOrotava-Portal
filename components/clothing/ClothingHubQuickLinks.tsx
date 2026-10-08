"use client";

import { ClipboardList, PackageCheck, Warehouse } from "lucide-react";

import { ClothingOpsLanes } from "@/components/clothing/ClothingOpsLanes";
import { appRoutes } from "@/lib/constants";

const iconClass = "size-4 shrink-0";

export function ClothingHubQuickLinks({
  featuredOrderId,
  pendingStorageUnits = 0,
}: {
  featuredOrderId?: string | null;
  pendingStorageUnits?: number;
}) {
  const warehouseHref =
    pendingStorageUnits > 0
      ? `${appRoutes.clothing.warehouse}?status=pending_storage`
      : appRoutes.clothing.warehouse;
  const orderHref = featuredOrderId
    ? appRoutes.clothing.orderDetail(featuredOrderId)
    : appRoutes.clothing.orders;

  const lanes = [
    {
      href: appRoutes.clothing.deliveries,
      title: "Registrar entrega",
      meta: "A jugadores",
      accent: true,
      icon: <PackageCheck className={iconClass} />,
    },
    {
      href: warehouseHref,
      title: pendingStorageUnits > 0 ? "Ubicar stock" : "Almacén",
      meta: pendingStorageUnits > 0 ? `${pendingStorageUnits} uds pendientes` : "Cajas y lotes",
      score: pendingStorageUnits > 0 ? String(pendingStorageUnits) : undefined,
      accent: pendingStorageUnits > 0,
      icon: <Warehouse className={iconClass} />,
    },
    {
      href: orderHref,
      title: featuredOrderId ? "Pedido abierto" : "Pedidos",
      meta: "Proveedor y serigrafía",
      icon: <ClipboardList className={iconClass} />,
    },
  ];

  return <ClothingOpsLanes lanes={lanes} />;
}
