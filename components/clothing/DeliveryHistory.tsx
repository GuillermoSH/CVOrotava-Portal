"use client";

import { useMemo, useState } from "react";

import { ChangeClothingSizeSheet } from "@/components/clothing/ChangeClothingSizeSheet";
import { ReturnClothingSheet } from "@/components/clothing/ReturnClothingSheet";
import { Badge } from "@/components/club/Badge";
import { Button } from "@/components/club/Button";
import { Input } from "@/components/club/Input";
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
import { formatSeasonShort, getSeasonSelectOptions } from "@/lib/season";
import type {
  ClothingDeliveryHistoryItem,
  ClothingInventoryLotWithDetails,
  ClothingPossessionItem,
  ClothingStorageLocationNode,
  PlayerWithTeam,
} from "@/lib/types/db";

function formatDeliveryDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDeliveryDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateInputValue(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DeliveryHistory({
  deliveries,
  players,
  possession,
  lots,
  storageTree,
}: {
  deliveries: ClothingDeliveryHistoryItem[];
  players: PlayerWithTeam[];
  possession: ClothingPossessionItem[];
  lots: ClothingInventoryLotWithDetails[];
  storageTree: ClothingStorageLocationNode[];
}) {
  const [playerFilter, setPlayerFilter] = useState("all");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [productQuery, setProductQuery] = useState("");
  const [jerseyQuery, setJerseyQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [returnItem, setReturnItem] = useState<ClothingPossessionItem | null>(null);
  const [sizeItem, setSizeItem] = useState<ClothingPossessionItem | null>(null);

  const possessionByDelivery = useMemo(
    () => new Map(possession.map((item) => [item.delivery_id, item])),
    [possession],
  );

  const playerOptions = useMemo(
    () => [
      { value: "all", label: "Todos los jugadores" },
      ...[...players]
        .sort((a, b) => a.full_name.localeCompare(b.full_name, "es"))
        .map((player) => ({ value: player.id, label: player.full_name })),
    ],
    [players],
  );

  const seasonOptions = useMemo(() => {
    const seasons = deliveries.map((item) => item.product.season);
    return [
      { value: "all", label: "Todas" },
      ...getSeasonSelectOptions(seasons, { pastCount: 4, futureCount: 0 }),
    ];
  }, [deliveries]);

  const kindOptions = [
    { value: "all", label: "Todos los tipos" },
    { value: "delivery", label: STOCK_MOVEMENT_KIND_LABELS.delivery },
    { value: "return", label: STOCK_MOVEMENT_KIND_LABELS.return },
  ];

  const filtered = useMemo(() => {
    const productQ = productQuery.trim().toLowerCase();
    const jerseyQ = jerseyQuery.trim().replace(/^#/, "");

    return deliveries.filter((item) => {
      if (playerFilter !== "all" && item.player_id !== playerFilter) return false;
      if (seasonFilter !== "all" && item.product.season !== seasonFilter) return false;
      if (kindFilter !== "all" && item.kind !== kindFilter) return false;

      if (productQ) {
        const haystack = [
          formatProductShort(item.product),
          item.product.model,
          formatClothingSize(item.size),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(productQ)) return false;
      }

      if (jerseyQ) {
        if (item.jersey_number == null || String(item.jersey_number) !== jerseyQ) {
          return false;
        }
      }

      const day = toDateInputValue(item.created_at);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;

      return true;
    });
  }, [
    deliveries,
    playerFilter,
    seasonFilter,
    kindFilter,
    productQuery,
    jerseyQuery,
    dateFrom,
    dateTo,
  ]);

  const hasFilters =
    playerFilter !== "all" ||
    seasonFilter !== "all" ||
    kindFilter !== "all" ||
    productQuery.trim() !== "" ||
    jerseyQuery.trim() !== "" ||
    dateFrom !== "" ||
    dateTo !== "";

  function clearFilters() {
    setPlayerFilter("all");
    setSeasonFilter("all");
    setKindFilter("all");
    setProductQuery("");
    setJerseyQuery("");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="section-title">Historial</h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          {filtered.length} registro{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <FormSelect
          label="Jugador"
          name="delivery-history-player"
          id="delivery-history-player"
          value={playerFilter}
          onChange={(e) => setPlayerFilter(e.target.value)}
          options={playerOptions}
        />
        <FormSelect
          label="Temporada"
          name="delivery-history-season"
          id="delivery-history-season"
          value={seasonFilter}
          onChange={(e) => setSeasonFilter(e.target.value)}
          options={seasonOptions}
        />
        <FormSelect
          label="Tipo"
          name="delivery-history-kind"
          id="delivery-history-kind"
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          options={kindOptions}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="delivery-history-product" className="text-sm font-medium text-foreground">
            Prenda
          </label>
          <Input
            id="delivery-history-product"
            type="search"
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            placeholder="Buscar prenda o talla"
            className="min-h-11"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="delivery-history-jersey" className="text-sm font-medium text-foreground">
            Dorsal
          </label>
          <Input
            id="delivery-history-jersey"
            type="search"
            inputMode="numeric"
            value={jerseyQuery}
            onChange={(e) => setJerseyQuery(e.target.value)}
            placeholder="#7"
            className="min-h-11 tabular-nums"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="delivery-history-from" className="text-sm font-medium text-foreground">
            Desde
          </label>
          <Input
            id="delivery-history-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="min-h-11"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="delivery-history-to" className="text-sm font-medium text-foreground">
            Hasta
          </label>
          <Input
            id="delivery-history-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="min-h-11"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--club-border)] px-6 py-8 text-center">
          <p className="font-medium text-foreground">
            {hasFilters ? "Ningún movimiento con estos filtros" : "Aún no hay entregas ni devoluciones"}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {hasFilters
              ? "Prueba otro jugador, temporada, tipo o rango de fechas."
              : "Las entregas y devoluciones aparecerán aquí."}
          </p>
          {hasFilters ? (
            <button type="button" className="btn-secondary mt-4 min-h-11 md:min-h-8" onClick={clearFilters}>
              Limpiar filtros
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 md:hidden">
            {filtered.map((item) => {
              const open = item.kind === "delivery" ? possessionByDelivery.get(item.id) : null;
              return (
                <article key={item.id} className="clothing-list-card flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 font-semibold text-foreground">{item.player_name}</p>
                    <time
                      dateTime={item.created_at}
                      className="shrink-0 text-xs tabular-nums text-muted-foreground"
                    >
                      {formatDeliveryDate(item.created_at)}
                    </time>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={item.kind === "return" ? "secondary" : "info"}>
                      {STOCK_MOVEMENT_KIND_LABELS[item.kind] ?? item.kind}
                    </Badge>
                    <Badge variant="outline">{formatSeasonShort(item.product.season)}</Badge>
                  </div>
                  <p className="text-sm text-foreground">
                    {formatProductShort(item.product)} · {formatClothingSize(item.size)} ·{" "}
                    {item.quantity} uds
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.jersey_number != null ? (
                      <Badge variant="secondary" className="text-[11px]">
                        {formatJerseyNumber(item.jersey_number)}
                      </Badge>
                    ) : null}
                    {item.notes ? (
                      <span className="line-clamp-1 text-xs text-muted-foreground">{item.notes}</span>
                    ) : null}
                  </div>
                  {open ? (
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="min-h-11"
                        onClick={() => setReturnItem(open)}
                      >
                        Devolver
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="min-h-11"
                        onClick={() => setSizeItem(open)}
                      >
                        Cambiar talla
                      </Button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="hidden md:block">
            <div className="glass-panel overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Prenda</TableHead>
                    <TableHead>Talla</TableHead>
                    <TableHead>Dorsal</TableHead>
                    <TableHead>Uds</TableHead>
                    <TableHead>Temp.</TableHead>
                    <TableHead className="w-[1%]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const open = item.kind === "delivery" ? possessionByDelivery.get(item.id) : null;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {formatDeliveryDateTime(item.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.kind === "return" ? "secondary" : "info"}>
                            {STOCK_MOVEMENT_KIND_LABELS[item.kind] ?? item.kind}
                          </Badge>
                        </TableCell>
                        <TableCell className="club-table__primary">{item.player_name}</TableCell>
                        <TableCell>{formatProductShort(item.product)}</TableCell>
                        <TableCell>{formatClothingSize(item.size)}</TableCell>
                        <TableCell className="tabular-nums">
                          {item.jersey_number != null
                            ? formatJerseyNumber(item.jersey_number)
                            : "—"}
                        </TableCell>
                        <TableCell className="tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {formatSeasonShort(item.product.season)}
                        </TableCell>
                        <TableCell>
                          {open ? (
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setReturnItem(open)}
                              >
                                Devolver
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setSizeItem(open)}
                              >
                                Talla
                              </Button>
                            </div>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

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
    </section>
  );
}
