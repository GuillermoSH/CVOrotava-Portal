"use client";

import { ClipboardPlus, PackageCheck, Shirt } from "lucide-react";

import { ClothingOpsLanes } from "@/components/clothing/ClothingOpsLanes";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { WarehouseBoxMark } from "@/components/clothing/WarehouseBoxMark";
import { appRoutes } from "@/lib/constants";

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
      icon: <PackageCheck className="size-4" aria-hidden />,
    },
    {
      href: warehouseHref,
      title: pendingStorageUnits > 0 ? "Ubicar stock" : "Almacén",
      meta: pendingStorageUnits > 0 ? `${pendingStorageUnits} uds` : "Cajas y lotes",
      score: pendingStorageUnits > 0 ? String(pendingStorageUnits) : undefined,
      accent: pendingStorageUnits > 0,
      icon: <WarehouseBoxMark size="icon" />,
    },
    {
      href: orderHref,
      title: featuredOrderId ? "Pedido abierto" : "Pedidos",
      meta: "Proveedor y serigrafía",
      icon: <ClipboardPlus className="size-4" aria-hidden />,
    },
    {
      href: appRoutes.clothing.newOrder,
      title: "Nuevo pedido",
      meta: "Alta a proveedor",
      icon: <ClipboardPlus className="size-4" aria-hidden />,
    },
    {
      href: appRoutes.clothing.products,
      title: "Prendas",
      meta: "Catálogo",
      icon: <Shirt className="size-4" aria-hidden />,
    },
    {
      href: appRoutes.clothing.locations,
      title: "Cajas",
      meta: "Ubicaciones",
      icon: <WarehouseBoxMark size="icon" />,
    },
  ];

  return (
    <>
      <ClothingOpsLanes lanes={lanes} />
      <ClothingStickyActionBar
        actions={[
          {
            type: "link",
            label: pendingStorageUnits > 0 ? "Ubicar stock" : "Almacén",
            href: warehouseHref,
            variant: "secondary",
          },
          { type: "link", label: "Registrar entrega", href: appRoutes.clothing.deliveries },
        ]}
      />
    </>
  );
}
