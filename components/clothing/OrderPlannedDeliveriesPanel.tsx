"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/club/Button";
import {
  PlannedDeliveriesEditor,
  plannedRowsFromDeliveries,
  plannedRowsToPayload,
  type PlannedRowDraft,
  type PlannedSkuOption,
} from "@/components/clothing/PlannedDeliveriesEditor";
import { setOrderPlannedDeliveriesAction } from "@/lib/actions/clothing/orders";
import { formatJerseyNumber } from "@/lib/clothing/formatJersey";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { plannedSkuKey } from "@/lib/clothing/plannedDeliveries";
import type {
  ClothingOrderLineWithProduct,
  ClothingPlannedDelivery,
  ClothingProduct,
  PlayerWithTeam,
} from "@/lib/types/db";
import { appToast } from "@/lib/toast";

/**
 * Entregas previstas de un pedido ya enviado o recibido: se pueden cambiar las pendientes y se
 * ve lo ya entregado (que no se toca).
 */
export function OrderPlannedDeliveriesPanel({
  orderId,
  lines,
  planned,
  players,
  editable,
}: {
  orderId: string;
  lines: ClothingOrderLineWithProduct[];
  planned: ClothingPlannedDelivery[];
  players: PlayerWithTeam[];
  editable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<PlannedRowDraft[]>(() => plannedRowsFromDeliveries(planned));

  const playerName = useMemo(
    () => new Map(players.map((p) => [p.id, p.full_name])),
    [players],
  );
  const products = useMemo<ClothingProduct[]>(() => {
    const byId = new Map<string, ClothingProduct>();
    for (const line of lines) byId.set(line.product_id, line.product);
    return [...byId.values()];
  }, [lines]);

  const options = useMemo<PlannedSkuOption[]>(() => {
    const bySku = new Map<string, PlannedSkuOption>();
    for (const line of lines) {
      const key = plannedSkuKey(line.product_id, line.size);
      const existing = bySku.get(key);
      if (existing) existing.ordered += line.quantity_ordered;
      else {
        bySku.set(key, {
          productId: line.product_id,
          size: line.size,
          ordered: line.quantity_ordered,
        });
      }
    }
    return [...bySku.values()];
  }, [lines]);

  const delivered = planned.filter((row) => row.delivered_at !== null);
  const deliveredBySku = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of delivered) {
      const key = plannedSkuKey(row.product_id, row.size);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [delivered]);

  function save() {
    const payload = plannedRowsToPayload(rows);
    if (!payload.ok) {
      appToast.error(payload.error);
      return;
    }
    startTransition(async () => {
      const result = await setOrderPlannedDeliveriesAction({
        order_id: orderId,
        planned: payload.rows,
      });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success("Entregas previstas guardadas");
      router.refresh();
    });
  }

  if (!editable && planned.length === 0) return null;

  return (
    <section id="entregas-previstas" className="flex scroll-mt-24 flex-col gap-4">
      <div>
        <h2 className="ropa-section-heading">Entregas previstas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Prendas del pedido asignadas a jugadores. En Entregas salen ya preparadas cuando hay stock.
        </p>
      </div>

      {delivered.length > 0 ? (
        <div className="rounded-xl border border-[var(--club-border)] px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Ya entregadas ({delivered.length})
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {delivered.map((row) => {
              const product = products.find((p) => p.id === row.product_id);
              return (
                <li key={row.id} className="text-sm text-foreground">
                  {playerName.get(row.player_id) ?? "Jugador"} ·{" "}
                  {product ? formatProductShort(product) : "Prenda"} ·{" "}
                  {formatClothingSize(row.size)}
                  {row.jersey_number != null ? ` · ${formatJerseyNumber(row.jersey_number)}` : ""}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {editable ? (
        <>
          <PlannedDeliveriesEditor
            rows={rows}
            onChange={setRows}
            options={options}
            products={products}
            players={players}
            deliveredBySku={deliveredBySku}
          />
          <div>
            <Button type="button" onClick={save} disabled={pending} className="min-h-11">
              {pending ? "Guardando…" : "Guardar entregas previstas"}
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}
