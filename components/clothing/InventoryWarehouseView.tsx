"use client";

import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { useState } from "react";

import { InventoryPageClient } from "@/components/clothing/InventoryPageClient";
import { ManualInventorySheet } from "@/components/clothing/ManualInventorySheet";
import { PageHeader } from "@/components/layout/PageHeader";
import { appRoutes } from "@/lib/constants";
import type {
  ClothingInventoryLotWithDetails,
  ClothingProduct,
  ClothingStorageLocationNode,
} from "@/lib/types/db";

export function InventoryWarehouseView({
  lots,
  products,
  storageTree,
}: {
  lots: ClothingInventoryLotWithDetails[];
  products: ClothingProduct[];
  storageTree: ClothingStorageLocationNode[];
}) {
  const [manualOpen, setManualOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        back={{ href: appRoutes.clothing.hub, label: "Gestión de ropa" }}
        title="Inventario"
        subtitle="Lotes pendientes de ubicar y stock en almacén."
        actions={
          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              className="btn-primary inline-flex min-h-11 items-center gap-1.5"
              onClick={() => setManualOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
              Añadir stock
            </button>
            <Link href={appRoutes.clothing.locations} className="btn-secondary inline-flex">
              Ubicaciones
            </Link>
          </div>
        }
      />

      <Link
        href={appRoutes.clothing.locations}
        className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium text-brand md:hidden"
      >
        <MapPin className="size-4 shrink-0" aria-hidden />
        Ubicaciones de almacén
      </Link>

      <InventoryPageClient
        lots={lots}
        storageTree={storageTree}
        onManualOpenChange={setManualOpen}
      />

      <ManualInventorySheet
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        products={products}
        storageTree={storageTree}
      />
    </div>
  );
}
