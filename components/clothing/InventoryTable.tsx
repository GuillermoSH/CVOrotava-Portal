"use client";

import { MapPin } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/club/Table";
import { TableActionsCell, TableTextAction } from "@/components/club/TableActions";
import { TableRowInteractive } from "@/components/club/TableRowInteractive";
import { InventorySourceBadge, InventoryStatusBadge } from "@/components/clothing/ClothingInventoryCard";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import type { ClothingInventoryLotWithDetails } from "@/lib/types/db";

export function InventoryTable({
  lots,
  onAssign,
}: {
  lots: ClothingInventoryLotWithDetails[];
  onAssign: (lot: ClothingInventoryLotWithDetails) => void;
}) {
  return (
    <div className="hidden md:block">
      <div className="glass-panel overflow-hidden">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Prenda</TableHead>
            <TableHead>Talla</TableHead>
            <TableHead className="text-end">Cantidad</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Ubicación</TableHead>
            <TableHead className="club-table__actions">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lots.map((lot) => {
            const canAssign = lot.status === "pending_storage";

            const row = (
              <>
                <TableCell className="max-w-[14rem] club-table__primary">{formatProductShort(lot.product)}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {formatClothingSize(lot.size)}
                </TableCell>
                <TableCell className="text-end tabular-nums">{lot.quantity}</TableCell>
                <TableCell>
                  <InventorySourceBadge sourceType={lot.source_type} />
                </TableCell>
                <TableCell>
                  <InventoryStatusBadge status={lot.status} />
                </TableCell>
                <TableCell className="max-w-[18rem] text-sm text-muted-foreground">
                  {lot.location_path ? (
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
                      <span className="truncate">{lot.location_path}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/70">Sin ubicación</span>
                  )}
                </TableCell>
                <TableActionsCell>
                  {canAssign ? (
                    <TableTextAction label="Ubicar" onClick={() => onAssign(lot)} />
                  ) : null}
                </TableActionsCell>
              </>
            );

            if (canAssign) {
              return (
                <TableRowInteractive key={lot.id} onActivate={() => onAssign(lot)}>
                  {row}
                </TableRowInteractive>
              );
            }

            return <TableRow key={lot.id}>{row}</TableRow>;
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
