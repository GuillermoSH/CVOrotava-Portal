"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/club/Button";
import { Tooltip, TooltipGroup } from "@/components/club/Tooltip";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { competitionNeedsJersey, formatJerseyNumber } from "@/lib/clothing/formatJersey";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import {
  buildBoxBoard,
  flattenBoxNodes,
  groupLotsByBox,
} from "@/lib/clothing/storageBoxes";
import { appRoutes } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type {
  ClothingInventoryLotWithDetails,
  ClothingStorageLocationNode,
} from "@/lib/types/db";

function lotSubtitle(lot: ClothingInventoryLotWithDetails) {
  const parts = [formatClothingSize(lot.size)];
  if (lot.jersey_number != null) parts.push(formatJerseyNumber(lot.jersey_number));
  if (competitionNeedsJersey(lot.product, lot.jersey_number)) parts.push("Falta #");
  return parts.join(" · ");
}

function BinLotRow({
  lot,
  onAssignJerseys,
}: {
  lot: ClothingInventoryLotWithDetails;
  onAssignJerseys: (lot: ClothingInventoryLotWithDetails) => void;
}) {
  const needsJersey = lot.jersey_number == null;
  const className = cn(
    "ropa-bin__row",
    needsJersey && "ropa-bin__row--action",
    competitionNeedsJersey(lot.product, lot.jersey_number) && "ropa-bin__row--warn",
  );

  const body = (
    <>
      <span className="ropa-bin__row-name">{formatProductShort(lot.product)}</span>
      <span className="ropa-bin__row-meta">{lotSubtitle(lot)}</span>
      <span className="ropa-bin__row-qty ropa-digit ropa-digit--sm">{lot.quantity}</span>
    </>
  );

  if (needsJersey) {
    return (
      <button
        type="button"
        className={className}
        aria-label={`Asignar dorsal a ${formatProductShort(lot.product)}`}
        onClick={() => onAssignJerseys(lot)}
      >
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}

function InventoryBin({
  box,
  lots,
  onWriteOff,
  onAssignJerseys,
}: {
  box: ClothingStorageLocationNode;
  lots: ClothingInventoryLotWithDetails[];
  onWriteOff: (storageLocationId: string | null, locationLabel: string) => void;
  onAssignJerseys: (lot: ClothingInventoryLotWithDetails) => void;
}) {
  const units = lots.reduce((sum, lot) => sum + lot.quantity, 0);
  const empty = lots.length === 0;

  return (
    <article className={cn("ropa-bin", empty && "ropa-bin--empty")}>
      <header className="ropa-bin__head">
        <div className="ropa-bin__id">
          <p className="ropa-bin__code">{box.code}</p>
          <h3 className="ropa-bin__name">{box.label}</h3>
        </div>
        <div className="ropa-bin__head-end">
          {empty ? (
            <span className="ropa-bin__empty-tag">Vacía</span>
          ) : (
            <p className="ropa-bin__score" aria-label={`${units} unidades`}>
              <span className="ropa-digit ropa-digit--md">{units}</span>
              <span className="ropa-bin__score-label">ud</span>
            </p>
          )}
          {!empty ? (
            <TooltipGroup>
              <Tooltip label={`Eliminar stock de ${box.code}`}>
                <button
                  type="button"
                  className="ropa-bin__icon-btn"
                  aria-label={`Eliminar stock de ${box.code}`}
                  onClick={() => onWriteOff(box.id, `${box.code} · ${box.label}`)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </Tooltip>
            </TooltipGroup>
          ) : null}
        </div>
      </header>

      {!empty ? (
        <div className="ropa-bin__body" role="list">
          {lots.map((lot) => (
            <div key={lot.id} role="listitem">
              <BinLotRow lot={lot} onAssignJerseys={onAssignJerseys} />
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function RackSection({
  title,
  code,
  children,
}: {
  title: string;
  code?: string;
  children: ReactNode;
}) {
  return (
    <section className="ropa-rack">
      <header className="ropa-rack__head">
        <h2 className="ropa-rack__title">{title}</h2>
        {code ? <span className="ropa-rack__code">{code}</span> : null}
      </header>
      <div className="ropa-rack__grid">{children}</div>
    </section>
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

  function binFor(box: ClothingStorageLocationNode) {
    const boxLots = groupById.get(box.id)?.lots ?? [];
    if (hideEmptyBoxes && boxLots.length === 0) return null;
    return (
      <InventoryBin
        key={box.id}
        box={box}
        lots={boxLots}
        onWriteOff={onWriteOff}
        onAssignJerseys={onAssignJerseys}
      />
    );
  }

  const looseBins = board.loose.map((box) => binFor(box)).filter(Boolean);
  const cabinetSections = board.cabinets
    .map(({ cabinet, boxes }) => {
      const bins = boxes.map((box) => binFor(box)).filter(Boolean);
      if (hideEmptyBoxes && bins.length === 0) return null;
      return { cabinet, bins, empty: boxes.length === 0 };
    })
    .filter((section) => section !== null);

  return (
    <div className="ropa-store">
      {showPending ? (
        <section className={cn("ropa-queue", pending.length > 0 && "ropa-queue--active")}>
          <header className="ropa-queue__head">
            <div>
              <h2 className="ropa-queue__title">Por ubicar</h2>
              <p className="ropa-queue__meta">
                {pending.length === 0
                  ? "Nada pendiente"
                  : pending.length === 1
                    ? "1 lote sin caja"
                    : `${pending.length} lotes sin caja`}
              </p>
            </div>
            {pending.length > 0 ? (
              <button
                type="button"
                className="ropa-queue__danger"
                onClick={() => onWriteOff(null, "Por ubicar")}
              >
                Eliminar stock
              </button>
            ) : null}
          </header>

          {pending.length === 0 ? (
            <p className="ropa-queue__empty">Todo el stock tiene ubicación.</p>
          ) : (
            <ul className="ropa-queue__list">
              {pending.map((lot) => (
                <li key={lot.id} className="ropa-queue__item">
                  <div className="ropa-queue__item-main">
                    <p className="ropa-queue__item-name">{formatProductShort(lot.product)}</p>
                    <p className="ropa-queue__item-meta">
                      {lotSubtitle(lot)}
                      {" · "}
                      <span className="ropa-digit ropa-digit--sm">{lot.quantity}</span> ud
                    </p>
                  </div>
                  <div className="ropa-queue__item-actions">
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
          <div className="ropa-empty">
            <p className="ropa-empty__title">Sin cajas todavía</p>
            <p className="ropa-empty__body">
              Crea ubicaciones para colocar el stock y encontrarlo al entregar.
            </p>
            <Link href={appRoutes.clothing.locations} className="btn-primary mt-5 inline-flex min-h-11 md:min-h-8">
              Ir a cajas
            </Link>
          </div>
        ) : hasCabinets ? (
          <div className="ropa-store__racks">
            {looseBins.length > 0 ? (
              <RackSection title="Cajas sueltas">{looseBins}</RackSection>
            ) : null}
            {cabinetSections.map((section) => (
              <RackSection
                key={section.cabinet.id}
                title={section.cabinet.label}
                code={section.cabinet.code}
              >
                {section.empty && section.bins.length === 0 ? (
                  <p className="ropa-rack__empty">Sin cajas en este armario.</p>
                ) : (
                  section.bins
                )}
              </RackSection>
            ))}
          </div>
        ) : (
          <div className="ropa-rack__grid">{looseBins}</div>
        )
      ) : null}
    </div>
  );
}
