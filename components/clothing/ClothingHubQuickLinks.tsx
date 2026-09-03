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
        <Link href={appRoutes.clothing.products} className="clothing-hub-tile min-h-11">
          <Shirt className="size-5 shrink-0 text-brand" aria-hidden />
          Prendas
        </Link>
        <Link href={appRoutes.clothing.locations} className="clothing-hub-tile min-h-11">
          <WarehouseBoxMark size="icon" />
          Cajas
        </Link>
      </div>

      <div className="hidden flex-wrap gap-3 md:flex">
        <Link href={appRoutes.clothing.newOrder} className="btn-primary min-h-11">
          Nuevo pedido
        </Link>
        <Link href={appRoutes.clothing.products} className="btn-secondary min-h-11">
          Prendas
        </Link>
        <Link href={appRoutes.clothing.locations} className="btn-secondary min-h-11">
          Cajas
        </Link>
      </div>

      <ClothingStickyActionBar
        actions={[{ type: "link", label: "Nuevo pedido", href: appRoutes.clothing.newOrder }]}
      />
    </>
  );
}
