"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/club/Button";
import { FormTextarea } from "@/components/club/forms";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { DeliveryAddItemSheet } from "@/components/clothing/DeliveryAddItemSheet";
import { PlayerPicker } from "@/components/clothing/PlayerPicker";
import { ProductColorBadge } from "@/components/clothing/ProductColorBadge";
import { deliverInventoryAction } from "@/lib/actions/clothing/inventory";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { formatJerseyNumber } from "@/lib/clothing/formatJersey";
import { formatProductName, formatProductShort } from "@/lib/clothing/formatProduct";
import {
  buildStockPools,
  formatPoolSource,
  stockPoolKey,
  type StockPool,
} from "@/lib/clothing/stockSources";
import { formatSeasonShort } from "@/lib/season";
import { appRoutes } from "@/lib/constants";
import type {
  ClothingInventoryLotWithDetails,
  ClothingPossessionItem,
  ClothingProduct,
  ClothingSize,
  ClothingStorageLocationNode,
  PlayerWithTeam,
} from "@/lib/types/db";
import { appToast } from "@/lib/toast";

type DeliveryLine = {
  sourceKey: string;
  productId: string;
  size: ClothingSize;
  storageLocationId: string | null;
  jerseyNumber: number | null;
  quantity: number;
};

export function DeliveryForm({
  lots,
  products,
  storageTree,
  players,
  possession,
}: {
  lots: ClothingInventoryLotWithDetails[];
  products: ClothingProduct[];
  storageTree: ClothingStorageLocationNode[];
  players: PlayerWithTeam[];
  possession: ClothingPossessionItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [playerId, setPlayerId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DeliveryLine[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  const pools = useMemo(() => buildStockPools(lots, storageTree), [lots, storageTree]);
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const player = useMemo(
    () => players.find((item) => item.id === playerId) ?? null,
    [players, playerId],
  );
  const playerPossession = useMemo(
    () => possession.filter((item) => item.player_id === playerId).slice(0, 6),
    [possession, playerId],
  );

  const sizeWarnings = useMemo(() => {
    if (!player?.clothing_size) return [];
    return lines
      .filter((line) => line.size !== player.clothing_size)
      .map((line) => {
        const product =
          productById.get(line.productId) ??
          lots.find((lot) => lot.product_id === line.productId)?.product;
        return {
          key: line.sourceKey,
          label: product ? formatProductShort(product) : "Prenda",
          size: line.size,
        };
      });
  }, [lines, player, productById, lots]);

  const remainingOnPool = useCallback(
    (pool: StockPool) => {
      const key = stockPoolKey(
        pool.productId,
        pool.size,
        pool.storageLocationId,
        pool.jerseyNumber,
      );
      const used = lines.reduce((sum, line) => {
        if (line.sourceKey !== key) return sum;
        return sum + line.quantity;
      }, 0);
      return Math.max(0, pool.quantity - used);
    },
    [lines],
  );

  function addFromPool(pool: StockPool) {
    const left = remainingOnPool(pool);
    if (left <= 0) {
      appToast.error("Ya no queda de esa prenda");
      return;
    }
    const key = stockPoolKey(
      pool.productId,
      pool.size,
      pool.storageLocationId,
      pool.jerseyNumber,
    );
    setLines((prev) => {
      const existing = prev.find((line) => line.sourceKey === key);
      if (existing) {
        if (pool.jerseyNumber != null) return prev;
        return prev.map((line) =>
          line.sourceKey === key ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...prev,
        {
          sourceKey: key,
          productId: pool.productId,
          size: pool.size,
          storageLocationId: pool.storageLocationId,
          jerseyNumber: pool.jerseyNumber,
          quantity: 1,
        },
      ];
    });
  }

  function setLineQuantity(sourceKey: string, quantity: number) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.sourceKey !== sourceKey) return line;
        return { ...line, quantity: Math.max(1, quantity) };
      }),
    );
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!playerId) {
      appToast.error("Selecciona el jugador");
      return;
    }
    if (lines.length === 0) {
      appToast.error("Añade al menos una prenda");
      return;
    }

    for (const line of lines) {
      const pool = pools.find(
        (item) =>
          stockPoolKey(item.productId, item.size, item.storageLocationId, item.jerseyNumber) ===
          line.sourceKey,
      );
      if (!pool) {
        appToast.error("Hay una prenda que ya no está en stock");
        return;
      }
      const max = remainingOnPool(pool) + line.quantity;
      if (line.quantity > max) {
        appToast.error(`Solo quedan ${max} uds. de una de las prendas`);
        return;
      }
    }

    startTransition(async () => {
      const result = await deliverInventoryAction({
        player_id: playerId,
        notes: notes.trim() || undefined,
        lines: lines.map((line) => ({
          product_id: line.productId,
          size: line.size,
          storage_location_id: line.storageLocationId,
          quantity: line.quantity,
          jersey_number: line.jerseyNumber,
        })),
      });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success("Entrega registrada");
      setLines([]);
      setNotes("");
      setPlayerId("");
      router.refresh();
    });
  }

  if (players.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--club-border)] px-6 py-10 text-center">
        <p className="font-medium text-foreground">No hay jugadores en la temporada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          La entrega se registra a un jugador del roster. Cuando haya plantilla, vuelve aquí.
        </p>
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--club-border)] px-6 py-10 text-center">
        <p className="font-medium text-foreground">No hay stock para entregar</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Añade o ubica prendas en el inventario antes de registrar una entrega.
        </p>
        <Link href={appRoutes.clothing.warehouse} className="btn-primary mt-5 inline-flex min-h-11">
          Ir a inventario
        </Link>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <section className="flex flex-col gap-5">
          <h2 className="section-title">Jugador</h2>
          <PlayerPicker players={players} value={playerId} onChange={setPlayerId} />
          {player?.clothing_size ? (
            <p className="text-sm text-muted-foreground">
              Talla preferida en ficha:{" "}
              <span className="font-medium text-foreground">
                {formatClothingSize(player.clothing_size)}
              </span>
            </p>
          ) : null}
          {playerId && playerPossession.length > 0 ? (
            <div className="rounded-xl border border-[var(--club-border)] px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Ya en posesión
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {playerPossession.map((item) => (
                  <li key={item.delivery_id} className="text-sm text-foreground">
                    {formatProductShort(item.product)} · {formatClothingSize(item.size)}
                    {item.jersey_number != null
                      ? ` · ${formatJerseyNumber(item.jersey_number)}`
                      : ""}{" "}
                    <span className="text-muted-foreground">
                      ({item.quantity} · {formatSeasonShort(item.product.season)})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {sizeWarnings.length > 0 ? (
            <div className="rounded-xl border border-[var(--club-border)] bg-[var(--club-surface-2)] px-4 py-3 text-sm text-foreground">
              <p className="font-medium">Talla distinta a la preferida</p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {sizeWarnings.map((warning) => (
                  <li key={warning.key}>
                    {warning.label}: entregas {formatClothingSize(warning.size)}, preferida{" "}
                    {formatClothingSize(player!.clothing_size!)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <FormTextarea
            label="Notas (opcional)"
            name="delivery-notes"
            id="delivery-notes"
            rows={2}
            maxLength={500}
            placeholder="Ej. Equipación infantil 26/27"
            className="min-h-[4.5rem] resize-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        <section className="flex flex-col gap-5 border-t border-[var(--club-border)] pt-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="section-title">Prendas</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {lines.length === 0
                  ? "Aún no hay prendas"
                  : lines.length === 1
                    ? "1 prenda"
                    : `${lines.length} prendas`}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-11 shrink-0"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
              Añadir
            </Button>
          </div>

          {lines.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {lines.map((line) => {
                const product =
                  productById.get(line.productId) ??
                  lots.find((lot) => lot.product_id === line.productId)?.product;
                const pool = pools.find(
                  (item) =>
                    stockPoolKey(
                      item.productId,
                      item.size,
                      item.storageLocationId,
                      item.jerseyNumber,
                    ) === line.sourceKey,
                );
                const max = pool ? remainingOnPool(pool) + line.quantity : line.quantity;
                return (
                  <li
                    key={line.sourceKey}
                    className="flex flex-col gap-3 rounded-xl border border-[var(--club-border)] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium tracking-tight text-foreground">
                            {product ? formatProductName(product) : "Prenda"}
                          </span>
                          {product ? (
                            <ProductColorBadge color={product.color} className="shrink-0" />
                          ) : null}
                        </p>
                        <p className="clothing-sheet-option__meta mt-1">
                          <span className="clothing-sheet-option__size">
                            {formatClothingSize(line.size)}
                          </span>
                          {line.jerseyNumber != null ? (
                            <span className="clothing-sheet-option__jersey">
                              {formatJerseyNumber(line.jerseyNumber)}
                            </span>
                          ) : null}
                          {product ? (
                            <span className="clothing-sheet-option__src">
                              {formatSeasonShort(product.season)}
                            </span>
                          ) : null}
                          {pool ? (
                            <span className="clothing-sheet-option__src">{formatPoolSource(pool)}</span>
                          ) : null}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-11 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setLines((prev) =>
                            prev.filter((item) => item.sourceKey !== line.sourceKey),
                          )
                        }
                        aria-label="Quitar prenda"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                    {line.jerseyNumber == null ? (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">Cantidad</span>
                        <div className="clothing-qty-stepper">
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="min-h-11 min-w-11"
                            disabled={line.quantity <= 1}
                            onClick={() => setLineQuantity(line.sourceKey, line.quantity - 1)}
                            aria-label="Quitar una"
                          >
                            <Minus className="size-4" aria-hidden />
                          </Button>
                          <span className="clothing-qty-stepper__value">{line.quantity}</span>
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="min-h-11 min-w-11"
                            disabled={line.quantity >= max}
                            onClick={() => setLineQuantity(line.sourceKey, line.quantity + 1)}
                            aria-label="Añadir una"
                          >
                            <Plus className="size-4" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}

          <button type="button" onClick={() => setAddOpen(true)} className="clothing-add-card">
            <Plus className="size-5 text-brand" aria-hidden />
            <span className="clothing-add-card__label">
              {lines.length === 0 ? "Añadir prenda del stock" : "Añadir otra prenda"}
            </span>
            <span className="clothing-add-card__hint">Por tipo, nombre, dorsal o temporada</span>
          </button>
        </section>

        <div className="hidden sm:block">
          <Button type="submit" className="min-h-11" disabled={pending}>
            {pending ? "Guardando…" : "Registrar entrega"}
          </Button>
        </div>
      </form>

      <DeliveryAddItemSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        pools={pools}
        remainingOnPool={remainingOnPool}
        onPick={addFromPool}
      />

      <ClothingStickyActionBar
        actions={[
          {
            type: "button",
            label: "Añadir prenda",
            variant: "secondary",
            onClick: () => setAddOpen(true),
          },
          {
            type: "button",
            label: "Registrar entrega",
            pending,
            onClick: () => handleSubmit(),
          },
        ]}
      />
    </>
  );
}
