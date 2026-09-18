"use client";

import { Shirt } from "lucide-react";
import { useMemo, useState } from "react";

import { ChangeClothingSizeSheet } from "@/components/clothing/ChangeClothingSizeSheet";
import { ReturnClothingSheet } from "@/components/clothing/ReturnClothingSheet";
import { Badge } from "@/components/club/Badge";
import { Button } from "@/components/club/Button";
import { FormSelect } from "@/components/club/forms";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/club/Table";
import { STOCK_MOVEMENT_KIND_LABELS } from "@/lib/clothing/constants";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { formatJerseyNumber } from "@/lib/clothing/formatJersey";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import { formatSeasonShort, getCurrentSeason, getSeasonSelectOptions } from "@/lib/season";
import type {
  ClothingDeliveryHistoryItem,
  ClothingInventoryLotWithDetails,
  ClothingPossessionItem,
  ClothingStorageLocationNode,
} from "@/lib/types/db";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PlayerClothingSection({
  possession,
  history,
  lots,
  storageTree,
  canWrite,
}: {
  possession: ClothingPossessionItem[];
  history: ClothingDeliveryHistoryItem[];
  lots: ClothingInventoryLotWithDetails[];
  storageTree: ClothingStorageLocationNode[];
  canWrite: boolean;
}) {
  const [season, setSeason] = useState(getCurrentSeason);
  const [returnItem, setReturnItem] = useState<ClothingPossessionItem | null>(null);
  const [sizeItem, setSizeItem] = useState<ClothingPossessionItem | null>(null);

  const seasonOptions = useMemo(() => {
    const seasons = [
      ...possession.map((item) => item.product.season),
      ...history.map((item) => item.product.season),
    ];
    return [
      { value: "all", label: "Todas" },
      ...getSeasonSelectOptions(seasons, { pastCount: 4, futureCount: 0 }),
    ];
  }, [possession, history]);

  const filteredPossession = useMemo(
    () =>
      season === "all"
        ? possession
        : possession.filter((item) => item.product.season === season),
    [possession, season],
  );

  const filteredHistory = useMemo(
    () =>
      season === "all"
        ? history
        : history.filter((item) => item.product.season === season),
    [history, season],
  );

  return (
    <section className="flex flex-col gap-6 border-t border-[var(--club-border)] pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--club-surface-2)] text-muted-foreground"
          >
            <Shirt className="size-4" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="section-title">Ropa</h2>
            <p className="text-sm text-muted-foreground">
              En posesión e historial de entregas y devoluciones
            </p>
          </div>
        </div>
        <FormSelect
          label="Temporada"
          name="player-clothing-season"
          id="player-clothing-season"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          options={seasonOptions}
          className="min-w-[9rem]"
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">En posesión</h3>
          <p className="text-xs tabular-nums text-muted-foreground">
            {filteredPossession.length} prenda
            {filteredPossession.length === 1 ? "" : "s"}
          </p>
        </div>

        {filteredPossession.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--club-border)] px-4 py-6 text-center text-sm text-muted-foreground">
            No hay prendas en posesión
            {season !== "all" ? ` en ${formatSeasonShort(season)}` : ""}.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {filteredPossession.map((item) => (
              <li
                key={item.delivery_id}
                className="flex flex-col gap-3 rounded-xl border border-[var(--club-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {formatProductShort(item.product)} · {formatClothingSize(item.size)}
                    {item.jersey_number != null
                      ? ` · ${formatJerseyNumber(item.jersey_number)}`
                      : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.quantity} uds · {formatSeasonShort(item.product.season)} · entregada{" "}
                    {formatDate(item.delivered_at)}
                  </p>
                </div>
                {canWrite ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="min-h-11"
                      onClick={() => setReturnItem(item)}
                    >
                      Devolver
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="min-h-11"
                      onClick={() => setSizeItem(item)}
                    >
                      Cambiar talla
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Historial</h3>
          <p className="text-xs tabular-nums text-muted-foreground">
            {filteredHistory.length} registro
            {filteredHistory.length === 1 ? "" : "s"}
          </p>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--club-border)] px-4 py-6 text-center text-sm text-muted-foreground">
            Aún no hay movimientos de ropa
            {season !== "all" ? ` en ${formatSeasonShort(season)}` : ""}.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 md:hidden">
              {filteredHistory.map((item) => (
                <article key={item.id} className="clothing-list-card flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant={item.kind === "return" ? "secondary" : "info"}>
                      {STOCK_MOVEMENT_KIND_LABELS[item.kind] ?? item.kind}
                    </Badge>
                    <time
                      dateTime={item.created_at}
                      className="shrink-0 text-xs tabular-nums text-muted-foreground"
                    >
                      {formatDate(item.created_at)}
                    </time>
                  </div>
                  <p className="text-sm text-foreground">
                    {formatProductShort(item.product)} · {formatClothingSize(item.size)} ·{" "}
                    {item.quantity} uds
                    {item.jersey_number != null
                      ? ` · ${formatJerseyNumber(item.jersey_number)}`
                      : ""}
                  </p>
                </article>
              ))}
            </div>

            <div className="hidden md:block">
              <div className="glass-panel overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Prenda</TableHead>
                      <TableHead>Talla</TableHead>
                      <TableHead>Dorsal</TableHead>
                      <TableHead>Uds</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {formatDateTime(item.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.kind === "return" ? "secondary" : "info"}>
                            {STOCK_MOVEMENT_KIND_LABELS[item.kind] ?? item.kind}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatProductShort(item.product)}</TableCell>
                        <TableCell>{formatClothingSize(item.size)}</TableCell>
                        <TableCell className="tabular-nums">
                          {item.jersey_number != null
                            ? formatJerseyNumber(item.jersey_number)
                            : "—"}
                        </TableCell>
                        <TableCell className="tabular-nums">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </div>

      {canWrite ? (
        <>
          <ReturnClothingSheet
            open={returnItem != null}
            onClose={() => setReturnItem(null)}
            item={returnItem}
            storageTree={storageTree}
          />
          <ChangeClothingSizeSheet
            open={sizeItem != null}
            onClose={() => setSizeItem(null)}
            item={sizeItem}
            lots={lots}
            storageTree={storageTree}
          />
        </>
      ) : null}
    </section>
  );
}
