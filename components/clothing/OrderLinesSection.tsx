"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/club/Table";
import { OrderLineReceivedEditor } from "@/components/clothing/OrderLineReceivedEditor";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import type { ClothingOrderLineWithProduct } from "@/lib/types/db";
import { cn } from "@/lib/utils";

function OrderLineCard({ line }: { line: ClothingOrderLineWithProduct }) {
  const isComplete = line.quantity_received >= line.quantity_ordered;

  return (
    <div className="clothing-list-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug text-foreground">{line.product.name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Talla {formatClothingSize(line.size)} · {line.quantity_ordered} pedidas
          </p>
        </div>
        {isComplete ? (
          <span className="shrink-0 text-xs font-medium text-success">
            Completo
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-end gap-3 border-t border-[var(--club-border)] pt-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Recibidas</span>
          <OrderLineReceivedEditor line={line} layout="mobile" />
        </label>
        <span className="shrink-0 pb-2.5 text-sm tabular-nums text-muted-foreground">
          de {line.quantity_ordered}
        </span>
      </div>
    </div>
  );
}

export function OrderLinesSection({ lines }: { lines: ClothingOrderLineWithProduct[] }) {
  if (lines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Este pedido no tiene líneas.</p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 md:hidden">
        {lines.map((line) => (
          <OrderLineCard key={line.id} line={line} />
        ))}
      </div>

      <div className="glass-panel hidden gap-0 !p-0 overflow-hidden md:block">
        <div className="border-b border-[var(--club-border)] px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Líneas del pedido</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prenda</TableHead>
              <TableHead>Talla</TableHead>
              <TableHead>Pedidas</TableHead>
              <TableHead>Recibidas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => {
              const isComplete = line.quantity_received >= line.quantity_ordered;

              return (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.product.name}</TableCell>
                  <TableCell>{formatClothingSize(line.size)}</TableCell>
                  <TableCell className="tabular-nums">{line.quantity_ordered}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <OrderLineReceivedEditor line={line} layout="table" />
                      {isComplete ? (
                        <span
                          className={cn(
                            "text-xs font-medium text-success",
                          )}
                        >
                          ✓
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
