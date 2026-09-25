"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/club/Button";
import { Tooltip, TooltipGroup } from "@/components/club/Tooltip";
import { WarehouseBoxMark, WarehouseCabinetMark } from "@/components/clothing/WarehouseBoxMark";
import { WarehouseCrate } from "@/components/clothing/WarehouseCrate";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { competitionNeedsJersey, formatJerseyNumber } from "@/lib/clothing/formatJersey";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import {
  buildBoxBoard,
  flattenBoxNodes,
  groupLotsByBox,
} from "@/lib/clothing/storageBoxes";
import { appRoutes } from "@/lib/constants";
import type {
  ClothingInventoryLotWithDetails,
  ClothingStorageLocationNode,
} from "@/lib/types/db";

function LotMeta({ lot }: { lot: ClothingInventoryLotWithDetails }) {
  const missingJersey = competitionNeedsJersey(lot.product, lot.jersey_number);
  return (
    <span className="warehouse-crate__line-meta">
      {formatClothingSize(lot.size)}
      {lot.jersey_number != null ? ` · ${formatJerseyNumber(lot.jersey_number)}` : null}
      {missingJersey ? (
        <>
          {" · "}
          <span className="text-destructive">Falta #</span>
        </>
      ) : null}
    </span>
  );
}

export function InventoryBoxBoard({
  lots,
  storageTree,
  showPending,
  showBoxes,
  hideEmptyBoxes = false,
  onAssign,
  onWriteOff,
  onAssignJerseys,
}: {
  lots: ClothingInventoryLotWithDetails[];
  storageTree: ClothingStorageLocationNode[];
  showPending: boolean;
  showBoxes: boolean;
  hideEmptyBoxes?: boolean;
  onAssign: (lot: ClothingInventoryLotWithDetails) => void;
  onWriteOff: (storageLocationId: string | null, locationLabel: string) => void;
  onAssignJerseys: (lot: ClothingInventoryLotWithDetails) => void;
}) {
  const { pending, groups } = useMemo(() => groupLotsByBox(lots, storageTree), [lots, storageTree]);
  const board = useMemo(() => buildBoxBoard(storageTree), [storageTree]);
  const hasCabinets = board.cabinets.length > 0;
  const boxCount = flattenBoxNodes(storageTree).length;

  const groupById = useMemo(() => {
    const map = new Map(groups.map((group) => [group.box.id, group]));
    return map;
  }, [groups]);

  function crateFor(box: ClothingStorageLocationNode) {
    const group = groupById.get(box.id);
    const boxLots = group?.lots ?? [];
    if (hideEmptyBoxes && boxLots.length === 0) return null;
    return (
      <WarehouseCrate
        key={box.id}
        variant="inventory"
        code={box.code}
        label={box.label}
        emptyLabel={boxLots.length === 0 ? "Vacía" : undefined}
        actions={
          boxLots.length > 0 ? (
            <TooltipGroup>
              <Tooltip label={`Eliminar stock de ${box.code}`}>
                <button
                  type="button"
                  className="warehouse-crate__action warehouse-crate__action--danger"
                  aria-label={`Eliminar stock de ${box.code}`}
                  onClick={() => onWriteOff(box.id, `${box.code} · ${box.label}`)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </Tooltip>
            </TooltipGroup>
          ) : null
        }
      >
        {boxLots.length > 0 ? (
          <div className="warehouse-crate__lines">
            {boxLots.map((lot) => {
              const line = (
                <>
                  <span className="warehouse-crate__line-name">{formatProductShort(lot.product)}</span>
                  <LotMeta lot={lot} />
                  <span className="warehouse-crate__line-meta">{lot.quantity}</span>
                </>
              );
              if (lot.jersey_number != null) {
                return (
                  <div key={lot.id} className="warehouse-crate__line">
                    {line}
                  </div>
                );
              }
              return (
                <button
                  key={lot.id}
                  type="button"
                  className="warehouse-crate__line warehouse-crate__line--action"
                  aria-label={`Asignar dorsal a ${formatProductShort(lot.product)}`}
                  onClick={() => onAssignJerseys(lot)}
                >
                  {line}
                </button>
              );
            })}
          </div>
        ) : null}
      </WarehouseCrate>
    );
  }

  const looseCrates = board.loose.map((box) => crateFor(box)).filter(Boolean);
  const cabinetSections = board.cabinets
    .map(({ cabinet, boxes }) => {
      const crates = boxes.map((box) => crateFor(box)).filter(Boolean);
      if (hideEmptyBoxes && crates.length === 0) return null;
      return { cabinet, crates, empty: boxes.length === 0 };
    })
    .filter((section) => section !== null);

  return (
    <div className="flex flex-col gap-6">
      {showPending ? (
        <section className="warehouse-pending">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <WarehouseBoxMark ghost size="icon" />
              Por ubicar
            </h2>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {pending.length === 1 ? "1 lote" : `${pending.length} lotes`}
              </p>
              {pending.length > 0 ? (
                <button
                  type="button"
                  className="text-xs font-medium text-destructive"
                  onClick={() => onWriteOff(null, "Por ubicar")}
                >
                  Eliminar stock
                </button>
              ) : null}
            </div>
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
                      {formatClothingSize(lot.size)}
                      {lot.jersey_number != null
                        ? ` · ${formatJerseyNumber(lot.jersey_number)}`
                        : null}
                      {competitionNeedsJersey(lot.product, lot.jersey_number) ? " · Falta #" : null}
                      {" · "}
                      {lot.quantity} uds.
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {lot.jersey_number == null ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-11 shrink-0 md:min-h-8 md:px-2.5"
                        onClick={() => onAssignJerseys(lot)}
                      >
                        Numerar
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="min-h-11 shrink-0 md:min-h-8 md:px-2.5"
                      onClick={() => onAssign(lot)}
                    >
                      Ubicar
                    </Button>
                  </div>
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
            {looseCrates.length > 0 ? (
              <section className="warehouse-bay">
                <h2 className="warehouse-bay__title">
                  <WarehouseBoxMark size="icon" />
                  Cajas sueltas
                </h2>
                <div className="warehouse-board">{looseCrates}</div>
              </section>
            ) : null}
            {cabinetSections.map((section) => (
              <section key={section.cabinet.id} className="warehouse-bay">
                <h2 className="warehouse-bay__title">
                  <WarehouseCabinetMark />
                  {section.cabinet.label}
                  <span className="ml-2 font-normal text-muted-foreground">{section.cabinet.code}</span>
                </h2>
                {section.empty && section.crates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin cajas en este armario.</p>
                ) : (
                  <div className="warehouse-board">{section.crates}</div>
                )}
              </section>
            ))}
          </div>
        ) : (
          <div className="warehouse-board">{looseCrates}</div>
        )
      ) : null}
    </div>
  );
}
