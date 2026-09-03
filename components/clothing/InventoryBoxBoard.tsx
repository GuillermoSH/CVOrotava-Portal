"use client";

import { useMemo } from "react";
import Link from "next/link";

import { Button } from "@/components/club/Button";
import { WarehouseBoxMark, WarehouseCabinetMark } from "@/components/clothing/WarehouseBoxMark";
import { WarehouseCrate } from "@/components/clothing/WarehouseCrate";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import {
  boxHomeLabel,
  buildBoxBoard,
  collectBoxHomes,
  flattenBoxNodes,
  groupLotsByBox,
} from "@/lib/clothing/storageBoxes";
import { appRoutes } from "@/lib/constants";
import type {
  ClothingInventoryLotWithDetails,
  ClothingStorageLocationNode,
} from "@/lib/types/db";

export function InventoryBoxBoard({
  lots,
  storageTree,
  showPending,
  showBoxes,
  onAssign,
}: {
  lots: ClothingInventoryLotWithDetails[];
  storageTree: ClothingStorageLocationNode[];
  showPending: boolean;
  showBoxes: boolean;
  onAssign: (lot: ClothingInventoryLotWithDetails) => void;
}) {
  const { pending, groups } = useMemo(() => groupLotsByBox(lots, storageTree), [lots, storageTree]);
  const board = useMemo(() => buildBoxBoard(storageTree), [storageTree]);
  const homes = useMemo(() => collectBoxHomes(storageTree), [storageTree]);
  const hasCabinets = board.cabinets.length > 0;
  const boxCount = flattenBoxNodes(storageTree).length;

  const groupById = useMemo(() => {
    const map = new Map(groups.map((group) => [group.box.id, group]));
    return map;
  }, [groups]);

  function crateFor(box: ClothingStorageLocationNode, home?: string) {
    const group = groupById.get(box.id);
    const boxLots = group?.lots ?? [];
    return (
      <WarehouseCrate
        key={box.id}
        variant="inventory"
        code={box.code}
        label={box.label}
        home={home}
        filled={boxLots.length > 0}
        emptyLabel={boxLots.length === 0 ? "Vacía" : undefined}
      >
        {boxLots.length > 0 ? (
          <div className="warehouse-crate__lines">
            {boxLots.map((lot) => (
              <div key={lot.id} className="warehouse-crate__line">
                <span className="warehouse-crate__line-name">{formatProductShort(lot.product)}</span>
                <span className="warehouse-crate__line-meta">{formatClothingSize(lot.size)}</span>
                <span className="warehouse-crate__line-meta">{lot.quantity}</span>
              </div>
            ))}
          </div>
        ) : null}
      </WarehouseCrate>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {showPending ? (
        <section className="warehouse-pending">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <WarehouseBoxMark ghost size="icon" />
              Por ubicar
            </h2>
            <p className="text-xs text-muted-foreground">
              {pending.length === 1 ? "1 lote" : `${pending.length} lotes`}
            </p>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay stock pendiente de caja.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {pending.map((lot) => (
                <li
                  key={lot.id}
                  className="flex items-center justify-between gap-3 rounded-md px-1 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {formatProductShort(lot.product)}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatClothingSize(lot.size)} · {lot.quantity} uds.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="min-h-11 shrink-0"
                    onClick={() => onAssign(lot)}
                  >
                    Ubicar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {showBoxes ? (
        boxCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay cajas.{" "}
            <Link href={appRoutes.clothing.locations} className="font-medium text-brand">
              Crea la primera
            </Link>{" "}
            para colocar el stock.
          </p>
        ) : hasCabinets ? (
          <div className="flex flex-col gap-7">
            {board.loose.length > 0 ? (
              <section className="warehouse-bay">
                <h2 className="warehouse-bay__title">
                  <WarehouseBoxMark size="icon" />
                  Cajas sueltas
                </h2>
                <div className="warehouse-board">
                  {board.loose.map((box) => crateFor(box, "Suelta"))}
                </div>
              </section>
            ) : null}
            {board.cabinets.map(({ cabinet, boxes }) => (
              <section key={cabinet.id} className="warehouse-bay">
                <h2 className="warehouse-bay__title">
                  <WarehouseCabinetMark />
                  {cabinet.label}
                  <span className="ml-2 font-normal text-muted-foreground">{cabinet.code}</span>
                </h2>
                {boxes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin cajas en este armario.</p>
                ) : (
                  <div className="warehouse-board">
                    {boxes.map((box) => {
                      const home = homes.find((item) => item.box.id === box.id);
                      return crateFor(box, home ? boxHomeLabel(home) : cabinet.label);
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        ) : (
          <div className="warehouse-board">
            {board.loose.map((box) => crateFor(box))}
          </div>
        )
      ) : null}
    </div>
  );
}
