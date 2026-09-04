"use client";

import Link from "next/link";
import { Shirt } from "lucide-react";

import { WarehouseBoxMark } from "@/components/clothing/WarehouseBoxMark";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { appRoutes } from "@/lib/constants";

export function ClothingHubQuickLinks() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:hidden">
        <Link href={appRoutes.clothing.warehouse} className="clothing-hub-tile min-h-11">
          <WarehouseBoxMark size="icon" />
          Inventario
        </Link>
        <Link href={appRoutes.clothing.locations} className="clothing-hub-tile min-h-11">
          <WarehouseBoxMark size="icon" />
          Cajas
        </Link>
        <Link href={appRoutes.clothing.products} className="clothing-hub-tile min-h-11 col-span-2">
          <Shirt className="size-5 shrink-0 text-brand" aria-hidden />
          Prendas
        </Link>
      </div>

      <div className="clothing-toolbar hidden md:flex">
        <Link href={appRoutes.clothing.newOrder} className="btn-primary">
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
        actions={[{ type: "link", label: "Nuevo pedido", href: appRoutes.clothing.newOrder }]}
      />
    </>
  );
}
