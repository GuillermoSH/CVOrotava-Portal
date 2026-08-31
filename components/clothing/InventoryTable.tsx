"use client";

import { MapPin } from "lucide-react";

import { Button } from "@/components/club/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/club/Table";
import { InventorySourceBadge, InventoryStatusBadge } from "@/components/clothing/ClothingInventoryCard";
import { formatClothingSize } from "@/lib/clothing/formatSize";
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
            <TableHead className="w-[7.5rem]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {lots.map((lot) => (
            <TableRow key={lot.id}>
              <TableCell className="max-w-[14rem] font-medium">{lot.product.name}</TableCell>
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
              <TableCell className="text-end">
                {lot.status === "pending_storage" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="min-h-9"
                    onClick={() => onAssign(lot)}
                  >
                    Ubicar
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
