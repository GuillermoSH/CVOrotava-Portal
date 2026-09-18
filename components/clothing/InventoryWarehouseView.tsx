"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useState } from "react";

import { InventoryPageClient } from "@/components/clothing/InventoryPageClient";
import { ManualInventorySheet } from "@/components/clothing/ManualInventorySheet";
import { DashboardPage } from "@/components/layout/DashboardPage";
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
  initialQuery = "",
}: {
  lots: ClothingInventoryLotWithDetails[];
  products: ClothingProduct[];
  storageTree: ClothingStorageLocationNode[];
  initialQuery?: string;
}) {
  const [manualOpen, setManualOpen] = useState(false);

  return (
    <DashboardPage
      className="flex flex-col gap-5"
      actions={
        <div className="clothing-toolbar hidden md:flex">
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-1.5"
            onClick={() => setManualOpen(true)}
          >
            <Plus className="size-4" aria-hidden />
            Añadir stock
          </button>
          <Link href={appRoutes.clothing.deliveries} className="btn-secondary inline-flex">
            Registrar entrega
          </Link>
          <Link href={appRoutes.clothing.locations} className="btn-secondary inline-flex">
            Cajas
          </Link>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 md:hidden">
        <Link
          href={appRoutes.clothing.deliveries}
          className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-brand"
        >
          Registrar entrega
        </Link>
        <Link
          href={appRoutes.clothing.locations}
          className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-brand"
        >
          Cajas
        </Link>
      </div>

      <InventoryPageClient
        lots={lots}
        storageTree={storageTree}
        onManualOpenChange={setManualOpen}
        initialQuery={initialQuery}
      />

      <ManualInventorySheet
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        products={products}
        storageTree={storageTree}
      />
    </DashboardPage>
  );
}
