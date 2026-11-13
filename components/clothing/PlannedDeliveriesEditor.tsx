"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/club/Button";
import { Input } from "@/components/club/Input";
import { Label } from "@/components/club/Label";
import { Select } from "@/components/club/Select";
import { PlayerPicker } from "@/components/clothing/PlayerPicker";
import { assignedBySku, plannedSkuKey } from "@/lib/clothing/plannedDeliveries";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import type {
  ClothingPlannedDelivery,
  ClothingProduct,
  ClothingSize,
  PlayerWithTeam,
} from "@/lib/types/db";

/** Una prenda prevista para un jugador, tal y como se edita en pantalla. */
export type PlannedRowDraft = {
  key: string;
  playerId: string;
  /** `productId::size` de una línea del pedido, o vacío si aún no se ha elegido. */
  sku: string;
  /** Dorsal como texto (vacío = sin dorsal). */
  jersey: string;
};

/** Prenda y talla que se pueden asignar (una por línea del pedido, sumando cantidades). */
export type PlannedSkuOption = {
  productId: string;
  size: ClothingSize;
  ordered: number;
};

let nextKey = 0;
export function newPlannedRow(patch: Partial<PlannedRowDraft> = {}): PlannedRowDraft {
  nextKey += 1;
  return { key: `planned-${nextKey}`, playerId: "", sku: "", jersey: "", ...patch };
}

export function plannedRowsFromDeliveries(
  planned: readonly ClothingPlannedDelivery[],
): PlannedRowDraft[] {
  return planned
    .filter((row) => row.delivered_at === null)
    .map((row) =>
      newPlannedRow({
        // Clave estable: un contador de módulo daría claves distintas en servidor y navegador.
        key: `planned-${row.id}`,
        playerId: row.player_id,
        sku: plannedSkuKey(row.product_id, row.size),
        jersey: row.jersey_number != null ? String(row.jersey_number) : "",
      }),
    );
}

/**
 * Filas listas para enviar al servidor. Devuelve un error legible si alguna está incompleta o
 * lleva un dorsal que no es un entero de 0 a 99.
 */
export function plannedRowsToPayload(
  rows: readonly PlannedRowDraft[],
): { ok: true; rows: { player_id: string; product_id: string; size: ClothingSize; jersey_number: number | null }[] } | { ok: false; error: string } {
  const out: { player_id: string; product_id: string; size: ClothingSize; jersey_number: number | null }[] = [];
  for (const [index, row] of rows.entries()) {
    if (!row.playerId || !row.sku) {
      return { ok: false, error: `Entrega prevista ${index + 1}: elige jugador y prenda` };
    }
    const [productId, size] = row.sku.split("::") as [string, ClothingSize];
    let jersey: number | null = null;
    if (row.jersey.trim() !== "") {
      jersey = Number(row.jersey.trim().replace(/^#/, ""));
      if (!Number.isInteger(jersey) || jersey < 0 || jersey > 99) {
        return { ok: false, error: `Entrega prevista ${index + 1}: el dorsal va de 0 a 99` };
      }
    }
    out.push({ player_id: row.playerId, product_id: productId, size, jersey_number: jersey });
  }
  return { ok: true, rows: out };
}

export function PlannedDeliveriesEditor({
  rows,
  onChange,
  options,
  products,
  players,
  deliveredBySku,
  disabled = false,
}: {
  rows: PlannedRowDraft[];
  onChange: (rows: PlannedRowDraft[]) => void;
  options: PlannedSkuOption[];
  products: ClothingProduct[];
  players: PlayerWithTeam[];
  /** Unidades ya entregadas por prenda y talla (cuentan como asignadas). */
  deliveredBySku?: ReadonlyMap<string, number>;
  disabled?: boolean;
}) {
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const selectOptions = useMemo(
    () =>
      options.map((option) => {
        const product = productById.get(option.productId);
        return {
          value: plannedSkuKey(option.productId, option.size),
          label: `${product ? formatProductShort(product) : "Prenda"} · ${formatClothingSize(option.size)}`,
        };
      }),
    [options, productById],
  );

  const assigned = useMemo(() => {
    const counts = assignedBySku(
      rows
        .filter((row) => row.sku)
        .map((row) => {
          const [productId, size] = row.sku.split("::") as [string, ClothingSize];
          return { product_id: productId, size };
        }),
    );
    for (const [key, n] of deliveredBySku ?? []) counts.set(key, (counts.get(key) ?? 0) + n);
    return counts;
  }, [rows, deliveredBySku]);

  const summary = options.map((option) => {
    const key = plannedSkuKey(option.productId, option.size);
    const product = productById.get(option.productId);
    return {
      key,
      label: `${product ? formatProductShort(product) : "Prenda"} · ${formatClothingSize(option.size)}`,
      assigned: assigned.get(key) ?? 0,
      ordered: option.ordered,
    };
  });

  function update(key: string, patch: Partial<PlannedRowDraft>) {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  /** Cambiar la prenda limpia el dorsal si la nueva no lo lleva. */
  function updateSku(key: string, sku: string) {
    const product = productById.get(sku.split("::")[0] ?? "");
    update(key, product && product.category !== "shirt_competition" ? { sku, jersey: "" } : { sku });
  }

  // Una tarjeta por jugador; las filas aún sin jugador van cada una en su tarjeta.
  const groups = useMemo(() => {
    const out: { id: string; playerId: string; rows: PlannedRowDraft[] }[] = [];
    for (const row of rows) {
      const existing = row.playerId ? out.find((g) => g.playerId === row.playerId) : undefined;
      if (existing) existing.rows.push(row);
      else out.push({ id: row.key, playerId: row.playerId, rows: [row] });
    }
    return out;
  }, [rows]);

  function setGroupPlayer(groupRows: PlannedRowDraft[], playerId: string) {
    const keys = new Set(groupRows.map((row) => row.key));
    onChange(rows.map((row) => (keys.has(row.key) ? { ...row, playerId } : row)));
  }

  function removeGroup(groupRows: PlannedRowDraft[]) {
    const keys = new Set(groupRows.map((row) => row.key));
    onChange(rows.filter((row) => !keys.has(row.key)));
  }

  return (
    <div className="flex flex-col gap-5">
      {summary.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {summary.map((item) => (
            <li
              key={item.key}
              className={
                item.assigned > item.ordered
                  ? "rounded-full border border-destructive px-3 py-1 text-xs text-destructive"
                  : "rounded-full border border-[var(--club-border)] px-3 py-1 text-xs text-muted-foreground"
              }
            >
              {item.label}:{" "}
              <span className="font-medium tabular-nums text-foreground">
                {item.assigned} de {item.ordered}
              </span>{" "}
              asignadas
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Añade primero las líneas del pedido para poder asignarlas a jugadores.
        </p>
      )}

      {groups.length > 0 ? (
        <div className="flex flex-col gap-3">
          {groups.map((group, groupIndex) => (
            <div
              key={group.rows[0]!.key}
              className="flex flex-col gap-4 rounded-xl border border-[var(--club-border)] p-4"
            >
              <div className="flex items-end gap-3">
                <div className="min-w-0 flex-1">
                  <PlayerPicker
                    players={players}
                    value={group.playerId}
                    onChange={(playerId) => setGroupPlayer(group.rows, playerId)}
                    id={`planned-player-${group.rows[0]!.key}`}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-11 text-muted-foreground hover:text-destructive"
                  onClick={() => removeGroup(group.rows)}
                  disabled={disabled}
                  aria-label={`Quitar al jugador ${groupIndex + 1} y sus prendas`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>

              <div className="flex flex-col gap-3">
                {group.rows.map((row, rowIndex) => {
                  const product = productById.get(row.sku.split("::")[0] ?? "");
                  const needsJersey = product?.category === "shirt_competition";
                  return (
                    <div
                      key={row.key}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_auto]"
                    >
                      <div className="flex flex-col gap-1.5">
                        {rowIndex === 0 ? (
                          <Label id={`planned-sku-${row.key}-label`}>Prenda y talla</Label>
                        ) : null}
                        <Select
                          id={`planned-sku-${row.key}`}
                          value={row.sku}
                          onChange={(sku) => updateSku(row.key, sku)}
                          options={selectOptions}
                          placeholder="Elige prenda…"
                          disabled={disabled || selectOptions.length === 0}
                          aria-label={`Prenda y talla ${rowIndex + 1} del jugador ${groupIndex + 1}`}
                        />
                      </div>
                      {needsJersey ? (
                        <div className="order-3 col-span-2 flex flex-col gap-1.5 sm:order-none sm:col-span-1">
                          {rowIndex === 0 ? (
                            <Label id={`planned-jersey-${row.key}-label`}>Dorsal</Label>
                          ) : null}
                          <Input
                            type="number"
                            min={0}
                            max={99}
                            inputMode="numeric"
                            className="min-h-11"
                            value={row.jersey}
                            onChange={(e) => update(row.key, { jersey: e.target.value })}
                            placeholder="Dorsal"
                            disabled={disabled}
                            aria-label={`Dorsal de la prenda ${rowIndex + 1} del jugador ${groupIndex + 1}`}
                          />
                        </div>
                      ) : (
                        <div className="hidden sm:block" aria-hidden />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-11 text-muted-foreground hover:text-destructive"
                        onClick={() => onChange(rows.filter((item) => item.key !== row.key))}
                        disabled={disabled}
                        aria-label={`Quitar la prenda ${rowIndex + 1} del jugador ${groupIndex + 1}`}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-11 w-full sm:w-auto sm:self-start"
                onClick={() => onChange([...rows, newPlannedRow({ playerId: group.playerId })])}
                disabled={disabled || options.length === 0 || !group.playerId}
              >
                <Plus className="size-4" aria-hidden />
                Añadir otra prenda a este jugador
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <Button
        type="button"
        variant="secondary"
        className="min-h-11 w-full sm:w-auto sm:self-start"
        onClick={() => onChange([...rows, newPlannedRow()])}
        disabled={disabled || options.length === 0}
      >
        <Plus className="size-4" aria-hidden />
        Añadir jugador
      </Button>
    </div>
  );
}
