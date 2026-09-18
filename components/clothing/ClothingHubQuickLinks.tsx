"use client";

import Link from "next/link";
import { ClipboardPlus, PackageCheck, Shirt } from "lucide-react";

import { WarehouseBoxMark } from "@/components/clothing/WarehouseBoxMark";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { appRoutes } from "@/lib/constants";

export function ClothingHubQuickLinks() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:hidden">
        <Link href={appRoutes.clothing.deliveries} className="clothing-hub-tile min-h-11 col-span-2">
          <PackageCheck className="size-5 shrink-0 text-brand" aria-hidden />
          Registrar entrega
        </Link>
        <Link href={appRoutes.clothing.warehouse} className="clothing-hub-tile min-h-11">
          <WarehouseBoxMark size="icon" />
          Inventario
        </Link>
        <Link href={appRoutes.clothing.locations} className="clothing-hub-tile min-h-11">
          <WarehouseBoxMark size="icon" />
          Cajas
        </Link>
        <Link href={appRoutes.clothing.products} className="clothing-hub-tile min-h-11">
          <Shirt className="size-5 shrink-0 text-brand" aria-hidden />
          Prendas
        </Link>
        <Link href={appRoutes.clothing.newOrder} className="clothing-hub-tile min-h-11">
          <ClipboardPlus className="size-5 shrink-0 text-brand" aria-hidden />
          Nuevo pedido
        </Link>
      </div>

      <div className="clothing-toolbar hidden md:flex">
        <Link href={appRoutes.clothing.deliveries} className="btn-primary">
          Registrar entrega
        </Link>
        <Link href={appRoutes.clothing.newOrder} className="btn-secondary">
          Nuevo pedido
        </Link>
        <Link href={appRoutes.clothing.warehouse} className="btn-secondary">
          Inventario
        </Link>
        <Link href={appRoutes.clothing.products} className="btn-secondary">
          Prendas
        </Link>
        <Link href={appRoutes.clothing.locations} className="btn-secondary">
          Cajas
        </Link>
      </div>

      <ClothingStickyActionBar
        actions={[
          {
            type: "link",
            label: "Nuevo pedido",
            href: appRoutes.clothing.newOrder,
            variant: "secondary",
          },
          { type: "link", label: "Registrar entrega", href: appRoutes.clothing.deliveries },
        ]}
      />
    </>
  );
}
