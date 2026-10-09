"use client";

import Link from "next/link";
import { ChevronLeft, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Button } from "@/components/club/Button";
import { FormSelect, FormTextarea } from "@/components/club/forms";
import { ClothingCategoryFold } from "@/components/clothing/ClothingCategoryFold";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { ProductPicker } from "@/components/clothing/ProductPicker";
import { WarehouseCrate } from "@/components/clothing/WarehouseCrate";
import { createManualInventoryBatchAction } from "@/lib/actions/clothing/inventory";
import {
  CLOTHING_SIZE_GROUPS,
  CLOTHING_SIZE_LABELS,
} from "@/lib/clothing/constants";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import {
  clearManualInventoryDraft,
  draftGroupUnits,
  expandDraftGroupsToBatchLines,
  readManualInventoryDraft,
  saveManualInventoryDraft,
  type ManualInventoryDraftGroup,
} from "@/lib/clothing/manual-inventory-draft";
import { boxHomeLabel, collectBoxHomes, flattenBoxNodes } from "@/lib/clothing/storageBoxes";
import { appRoutes } from "@/lib/constants";
import { formatSeasonShort, getCurrentSeason, getSeasonSelectOptions } from "@/lib/season";
import { appToast } from "@/lib/toast";
import type {
  ClothingProduct,
  ClothingSize,
  ClothingStorageLocationNode,
} from "@/lib/types/db";

type Step = "compose" | "confirm";

function newClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Agrupa dorsales repetidos para chips (#7 ×2). Orden = primera aparición. */
function aggregateJerseyCounts(jerseys: number[]): { jersey: number; count: number }[] {
  const order: number[] = [];
  const counts = new Map<number, number>();
  for (const jersey of jerseys) {
    if (!counts.has(jersey)) order.push(jersey);
    counts.set(jersey, (counts.get(jersey) ?? 0) + 1);
  }
  return order.map((jersey) => ({ jersey, count: counts.get(jersey)! }));
}

function formatJerseyChip(jersey: number, count: number): string {
  return count > 1 ? `#${jersey} ×${count}` : `#${jersey}`;
}

export function ManualInventoryBatchPage({
  products,
  storageTree,
}: {
  products: ClothingProduct[];
  storageTree: ClothingStorageLocationNode[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const hydratedRef = useRef(false);

  const allBoxes = useMemo(() => flattenBoxNodes(storageTree), [storageTree]);
  const homes = useMemo(() => collectBoxHomes(storageTree), [storageTree]);

  const seasonOptions = useMemo(() => {
    const seasonsFromData = [
      ...products.map((p) => p.season),
      ...allBoxes.map((b) => b.season),
    ];
    return getSeasonSelectOptions(seasonsFromData, { pastCount: 4, futureCount: 0 });
  }, [products, allBoxes]);

  const [step, setStep] = useState<Step>("compose");
  const [season, setSeason] = useState(getCurrentSeason());
  const [productId, setProductId] = useState("");
  const [groups, setGroups] = useState<ManualInventoryDraftGroup[]>([]);
  const [sizeQtys, setSizeQtys] = useState<Partial<Record<ClothingSize, string>>>({});
  const [openSizeGroups, setOpenSizeGroups] = useState<Set<string>>(() => new Set(["adult"]));
  const [jerseyDraftByGroup, setJerseyDraftByGroup] = useState<Record<string, string>>({});
  const [assignBox, setAssignBox] = useState(false);
  const [boxId, setBoxId] = useState("");
  const [notes, setNotes] = useState("");

  const seasonProducts = useMemo(
    () =>
      products.filter(
        (product) => product.season === season && (product.is_active || product.id === productId),
      ),
    [products, season, productId],
  );

  const selectedProduct = seasonProducts.find((p) => p.id === productId) ?? null;

  const boxes = useMemo(
    () => allBoxes.filter((box) => box.season === season),
    [allBoxes, season],
  );

  const units = draftGroupUnits(groups);

  useEffect(() => {
    const draft = readManualInventoryDraft();
    if (draft) {
      setSeason(draft.season);
      setProductId(draft.product_id);
      setGroups(draft.groups);
    }
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!productId) {
      const t = window.setTimeout(() => {
        clearManualInventoryDraft();
      }, 250);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      saveManualInventoryDraft({
        season,
        product_id: productId,
        groups,
      });
    }, 250);
    return () => window.clearTimeout(t);
  }, [season, productId, groups]);

  function handleSeasonChange(next: string) {
    setSeason(next);
    setProductId("");
    setGroups([]);
    setSizeQtys({});
    setJerseyDraftByGroup({});
    setBoxId("");
    setStep("compose");
  }

  function handleProductChange(next: string) {
    if (next === productId) return;
    setProductId(next);
    setGroups([]);
    setSizeQtys({});
    setJerseyDraftByGroup({});
    setStep("compose");
  }

  function mergeSizesIntoDraft() {
    const additions: { size: ClothingSize; quantity: number }[] = [];
    for (const [size, raw] of Object.entries(sizeQtys) as [ClothingSize, string | undefined][]) {
      if (!raw?.trim()) continue;
      const qty = Number.parseInt(raw, 10);
      // 0 = ignore this size (cleared field). Only reject non-numeric junk.
      if (!Number.isFinite(qty) || qty < 0) {
        appToast.error(`Cantidad inválida en talla ${CLOTHING_SIZE_LABELS[size]}`);
        return;
      }
      if (qty === 0) continue;
      additions.push({ size, quantity: qty });
    }
    if (additions.length === 0) {
      appToast.error("Indica al menos una cantidad");
      return;
    }

    setGroups((prev) => {
      const next = prev.map((group) => ({ ...group, jersey_numbers: [...group.jersey_numbers] }));
      for (const add of additions) {
        const existing = next.find((group) => group.size === add.size);
        if (existing) {
          existing.quantity += add.quantity;
        } else {
          next.push({
            clientId: newClientId(),
            size: add.size,
            quantity: add.quantity,
            jersey_numbers: [],
          });
        }
      }
      return next;
    });
    setSizeQtys({});
    appToast.success("Cantidades añadidas al borrador");
  }

  function updateGroupQty(clientId: string, raw: string) {
    const qty = Number.parseInt(raw, 10);
    if (!Number.isFinite(qty) || qty < 0) return;

    if (qty === 0) {
      const group = groups.find((item) => item.clientId === clientId);
      if (group && group.jersey_numbers.length > 0) {
        appToast.error("Quita los dorsales antes de dejar la talla a 0");
        return;
      }
      removeGroup(clientId);
      return;
    }

    setGroups((prev) =>
      prev.map((group) => {
        if (group.clientId !== clientId) return group;
        if (qty < group.jersey_numbers.length) {
          appToast.error(
            `Hay ${group.jersey_numbers.length} dorsales. Baja dorsales o deja al menos esa cantidad.`,
          );
          return group;
        }
        return { ...group, quantity: qty };
      }),
    );
  }

  function addJerseyToGroup(clientId: string) {
    const group = groups.find((item) => item.clientId === clientId);
    if (!group) return;

    const raw = jerseyDraftByGroup[clientId] ?? "";
    const parsed = Number.parseInt(raw.trim(), 10);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 99) {
      appToast.error("El dorsal debe estar entre 0 y 99");
      return;
    }
    if (group.jersey_numbers.length >= group.quantity) {
      appToast.error(
        `Las ${CLOTHING_SIZE_LABELS[group.size]} ya tienen dorsal en todas las unidades. Sube la cantidad del borrador para añadir otro.`,
      );
      return;
    }

    setGroups((prev) =>
      prev.map((item) =>
        item.clientId === clientId
          ? { ...item, jersey_numbers: [...item.jersey_numbers, parsed] }
          : item,
      ),
    );
    setJerseyDraftByGroup((prev) => ({ ...prev, [clientId]: "" }));
  }

  /** Quita una unidad de ese dorsal (si había ×3 pasa a ×2). */
  function removeJerseyFromGroup(clientId: string, jersey: number) {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.clientId !== clientId) return group;
        const index = group.jersey_numbers.lastIndexOf(jersey);
        if (index < 0) return group;
        const next = [...group.jersey_numbers];
        next.splice(index, 1);
        return { ...group, jersey_numbers: next };
      }),
    );
  }

  function removeGroup(clientId: string) {
    setGroups((prev) => prev.filter((group) => group.clientId !== clientId));
    setJerseyDraftByGroup((prev) => {
      const next = { ...prev };
      delete next[clientId];
      return next;
    });
  }

  function clearDraft() {
    setGroups([]);
    setSizeQtys({});
    setJerseyDraftByGroup({});
    clearManualInventoryDraft(
      productId ? { season, product_id: productId } : undefined,
    );
    appToast.success("Borrador vaciado");
  }

  function goConfirm() {
    if (!productId) {
      appToast.error("Selecciona una prenda");
      return;
    }
    if (groups.length === 0) {
      appToast.error("Añade al menos una talla al borrador");
      return;
    }
    setStep("confirm");
  }

  function handleConfirm() {
    if (!productId) {
      appToast.error("Selecciona una prenda");
      return;
    }
    if (assignBox && !boxId) {
      appToast.error("Selecciona una caja o desactiva la ubicación");
      return;
    }

    const lines = expandDraftGroupsToBatchLines(groups);
    if (lines.length === 0) {
      appToast.error("Añade al menos una talla al borrador");
      return;
    }

    startTransition(async () => {
      const result = await createManualInventoryBatchAction({
        product_id: productId,
        storage_location_id: assignBox && boxId ? boxId : null,
        notes: notes.trim() || undefined,
        lines,
      });

      if (!result.ok) {
        appToast.error(result.error);
        return;
      }

      clearManualInventoryDraft({ season, product_id: productId });
      appToast.success(
        assignBox
          ? `Stock añadido: ${units} uds ubicadas`
          : `Stock añadido: ${units} uds (pendiente ubicar)`,
      );
      router.push(appRoutes.clothing.warehouse);
      router.refresh();
    });
  }

  const summaryRows = useMemo(
    () =>
      groups.map((group) => ({
        size: group.size,
        qty: group.quantity,
        jerseys: aggregateJerseyCounts(group.jersey_numbers),
        withoutJersey: group.quantity - group.jersey_numbers.length,
      })),
    [groups],
  );

  return (
    <div className="flex flex-col gap-5">
      {step === "compose" ? (
        <>
          <section className="ropa-panel">
            <div className="ropa-panel__bar">
              <h2 className="ropa-panel__title">Componer lote</h2>
              <span className="ropa-panel__meta">
                {units > 0 ? (
                  <>
                    <span className="ropa-digit ropa-digit--sm">{units}</span> uds en borrador
                  </>
                ) : (
                  "Una prenda por carga"
                )}
              </span>
            </div>

            <div className="ropa-panel__block">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-3">
                <FormSelect
                  label="Temporada"
                  name="batch-season"
                  id="batch-season"
                  value={season}
                  onChange={(e) => handleSeasonChange(e.target.value)}
                  options={seasonOptions.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                  }))}
                  className="order-1 w-full shrink-0 md:order-2 md:w-[6.75rem]"
                />

                <div className="order-2 min-w-0 flex-1 md:order-1">
                  {seasonProducts.length === 0 ? (
                    <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--club-border)] px-3 py-3 text-sm text-muted-foreground">
                      No hay prendas en {formatSeasonShort(season)}. Crea la prenda en Prendas o
                      elige otra temporada.
                    </p>
                  ) : (
                    <ProductPicker
                      products={seasonProducts}
                      value={productId}
                      onChange={handleProductChange}
                      id="batch-product"
                    />
                  )}
                </div>
              </div>
            </div>

            {productId ? (
              <div className="ropa-panel__block flex flex-col gap-5">
                <div>
                  <p className="ropa-section-label">Cantidades por talla</p>
                  <div className="mt-3.5 flex flex-col gap-3.5">
                    {CLOTHING_SIZE_GROUPS.map((group) => {
                      const filled = group.sizes.some((size) => sizeQtys[size]?.trim());
                      const open = openSizeGroups.has(group.id) || filled;
                      return (
                        <ClothingCategoryFold
                          key={group.id}
                          id={`batch-sizes-${group.id}`}
                          label={group.label}
                          count={group.sizes.length}
                          open={open}
                          onToggle={() =>
                            setOpenSizeGroups((prev) => {
                              const next = new Set(prev);
                              if (open) next.delete(group.id);
                              else next.add(group.id);
                              return next;
                            })
                          }
                        >
                          <div className="ropa-size-qty-grid">
                            {group.sizes.map((size) => (
                              <label key={size} className="ropa-size-qty">
                                <span className="ropa-size-qty__size">
                                  {CLOTHING_SIZE_LABELS[size]}
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  max={9999}
                                  inputMode="numeric"
                                  placeholder="0"
                                  aria-label={`Cantidad ${CLOTHING_SIZE_LABELS[size]}`}
                                  className="ropa-size-qty__input"
                                  value={sizeQtys[size] ?? ""}
                                  onChange={(e) =>
                                    setSizeQtys((prev) => ({
                                      ...prev,
                                      [size]: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                            ))}
                          </div>
                        </ClothingCategoryFold>
                      );
                    })}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 w-full sm:w-auto"
                  onClick={mergeSizesIntoDraft}
                >
                  <Plus className="size-4" aria-hidden />
                  Sumar al borrador
                </Button>
              </div>
            ) : null}

            <div className="ropa-panel__block">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="ropa-section-heading">Borrador</h3>
                {groups.length > 0 ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    onClick={clearDraft}
                  >
                    Vaciar
                  </button>
                ) : null}
              </div>

              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Suma tallas de esta prenda. Luego puedes asignar dorsales a cada grupo.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {groups.map((group) => {
                    const slotsLeft = group.quantity - group.jersey_numbers.length;
                    const jerseyInputId = `batch-jersey-${group.clientId}`;
                    const sizeLabel = CLOTHING_SIZE_LABELS[group.size];
                    return (
                      <li
                        key={group.clientId}
                        className="rounded-[var(--radius-sm)] border border-[var(--ropa-line)] bg-[var(--club-surface)] px-2 py-1.5"
                      >
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <label
                              className="inline-flex h-9 w-[7.25rem] shrink-0 items-center gap-1 rounded-[var(--radius-xs)] border border-[var(--ropa-line)] bg-[var(--ropa-panel)] pl-2 pr-1"
                              title={`${sizeLabel} · ${group.quantity} uds`}
                            >
                              <span className="w-8 shrink-0 text-sm font-semibold tabular-nums text-foreground">
                                {sizeLabel}
                              </span>
                              <span className="text-xs text-muted-foreground" aria-hidden>
                                ×
                              </span>
                              <input
                                type="number"
                                min={group.jersey_numbers.length}
                                max={9999}
                                inputMode="numeric"
                                aria-label={`Cantidad ${sizeLabel}`}
                                className="h-7 w-[3.25rem] rounded-[var(--radius-xs)] border-0 bg-transparent px-1 text-center text-sm font-semibold tabular-nums text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--club-brand)_35%,transparent)]"
                                value={group.quantity}
                                onChange={(e) => updateGroupQty(group.clientId, e.target.value)}
                              />
                            </label>

                            <span className="w-9 shrink-0 text-center text-[0.6875rem] font-medium tabular-nums text-muted-foreground">
                              {group.jersey_numbers.length}/{group.quantity}
                            </span>

                            {/* Desktop: chips between size and dorsal controls */}
                            <div className="hidden min-w-0 flex-1 flex-wrap items-center gap-1.5 md:flex">
                              {aggregateJerseyCounts(group.jersey_numbers).map(({ jersey, count }) => (
                                <button
                                  key={jersey}
                                  type="button"
                                  className="group/chip inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-[var(--ropa-line)] bg-[var(--ropa-panel)] pl-2.5 pr-1.5 text-sm font-semibold tabular-nums text-foreground transition-colors hover:border-[color-mix(in_srgb,var(--club-brand)_45%,var(--ropa-line))] hover:bg-[var(--club-brand-soft)] hover:text-[var(--club-brand-strong)] active:bg-[var(--club-brand-soft)]"
                                  onClick={() => removeJerseyFromGroup(group.clientId, jersey)}
                                  aria-label={
                                    count > 1
                                      ? `Quitar una unidad del dorsal ${jersey} (${count})`
                                      : `Quitar dorsal ${jersey}`
                                  }
                                  title={count > 1 ? "Quitar una unidad" : "Quitar dorsal"}
                                >
                                  <span>{formatJerseyChip(jersey, count)}</span>
                                  <span
                                    className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors group-hover/chip:bg-[color-mix(in_srgb,var(--club-brand)_18%,transparent)] group-hover/chip:text-[var(--club-brand-strong)]"
                                    aria-hidden
                                  >
                                    <X className="size-3.5" strokeWidth={2.5} />
                                  </span>
                                </button>
                              ))}
                            </div>

                            <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-0">
                              <input
                                type="number"
                                min={0}
                                max={99}
                                inputMode="numeric"
                                id={jerseyInputId}
                                name={jerseyInputId}
                                aria-label={
                                  slotsLeft > 0
                                    ? `Añadir dorsal a ${sizeLabel}, ${slotsLeft} hueco${slotsLeft === 1 ? "" : "s"}`
                                    : `Dorsales completos en ${sizeLabel}`
                                }
                                placeholder="#"
                                disabled={slotsLeft <= 0}
                                className="h-9 w-14 rounded-[var(--radius-xs)] border border-[var(--ropa-line)] bg-[var(--ropa-panel)] px-1.5 text-center text-sm tabular-nums text-foreground outline-none disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--club-brand)_35%,transparent)]"
                                value={jerseyDraftByGroup[group.clientId] ?? ""}
                                onChange={(e) =>
                                  setJerseyDraftByGroup((prev) => ({
                                    ...prev,
                                    [group.clientId]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addJerseyToGroup(group.clientId);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="inline-flex size-9 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--ropa-line)] bg-[var(--ropa-panel)] text-foreground transition-colors hover:border-[var(--club-brand)] hover:bg-[var(--club-brand-soft)] disabled:opacity-40"
                                disabled={slotsLeft <= 0}
                                aria-label={`Añadir dorsal a ${sizeLabel}`}
                                onClick={() => addJerseyToGroup(group.clientId)}
                              >
                                <Plus className="size-4" aria-hidden />
                              </button>
                              <button
                                type="button"
                                className="inline-flex size-9 items-center justify-center rounded-[var(--radius-xs)] border border-transparent text-muted-foreground transition-colors hover:border-[color-mix(in_srgb,var(--club-brand)_35%,transparent)] hover:bg-[var(--club-brand-soft)] hover:text-[var(--club-brand-strong)]"
                                aria-label={`Quitar ${sizeLabel}`}
                                title={`Quitar ${sizeLabel}`}
                                onClick={() => removeGroup(group.clientId)}
                              >
                                <Trash2 className="size-4" aria-hidden />
                              </button>
                            </div>
                          </div>

                          {/* Mobile: chips on second row */}
                          {group.jersey_numbers.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5 md:hidden">
                              {aggregateJerseyCounts(group.jersey_numbers).map(({ jersey, count }) => (
                                <button
                                  key={jersey}
                                  type="button"
                                  className="group/chip inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-[var(--ropa-line)] bg-[var(--ropa-panel)] pl-3 pr-2 text-sm font-semibold tabular-nums text-foreground transition-colors active:bg-[var(--club-brand-soft)] active:text-[var(--club-brand-strong)]"
                                  onClick={() => removeJerseyFromGroup(group.clientId, jersey)}
                                  aria-label={
                                    count > 1
                                      ? `Quitar una unidad del dorsal ${jersey} (${count})`
                                      : `Quitar dorsal ${jersey}`
                                  }
                                  title={count > 1 ? "Quitar una unidad" : "Quitar dorsal"}
                                >
                                  <span>{formatJerseyChip(jersey, count)}</span>
                                  <span
                                    className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground"
                                    aria-hidden
                                  >
                                    <X className="size-3.5" strokeWidth={2.5} />
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <div className="clothing-toolbar hidden border-t border-[var(--club-border)] pt-6 md:flex">
            <Button type="button" disabled={groups.length === 0} onClick={goConfirm}>
              Revisar ({units} uds)
            </Button>
            <Link
              href={appRoutes.clothing.warehouse}
              className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Volver a almacén
            </Link>
          </div>

          <ClothingStickyActionBar
            layout="split"
            actions={[
              {
                type: "link",
                href: appRoutes.clothing.warehouse,
                icon: <ChevronLeft className="size-5" aria-hidden />,
                "aria-label": "Volver a almacén",
                variant: "secondary",
                primacy: "leading",
              },
              {
                type: "button",
                label: `Revisar (${units} uds)`,
                onClick: goConfirm,
                disabled: groups.length === 0,
                primacy: "primary",
              },
            ]}
          />
        </>
      ) : (
        <>
          <section className="ropa-panel">
            <div className="ropa-panel__bar">
              <h2 className="ropa-panel__title">Confirmar carga</h2>
              <span className="ropa-panel__meta">
                <span className="ropa-digit ropa-digit--sm">{units}</span> uds
              </span>
            </div>

            <div className="ropa-panel__block">
              <p className="ropa-section-label">Prenda</p>
              <p className="mt-1.5 text-base font-semibold tracking-tight text-foreground">
                {selectedProduct
                  ? formatProductShort(selectedProduct)
                  : "Prenda seleccionada"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Temporada {formatSeasonShort(season)}
              </p>
            </div>

            <div className="ropa-panel__block">
              <p className="ropa-section-label mb-3">Resumen</p>
              <ul className="flex flex-col gap-2">
                {summaryRows.map((row) => (
                  <li
                    key={row.size}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-[var(--radius-sm)] border border-[var(--ropa-line)] bg-[var(--ropa-panel)] px-3 py-2"
                  >
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {CLOTHING_SIZE_LABELS[row.size]}
                    </span>
                    <span className="ropa-digit ropa-digit--sm">{row.qty}</span>
                    {row.jerseys.length > 0 ? (
                      <span className="w-full text-xs tabular-nums text-muted-foreground">
                        Dorsales:{" "}
                        {row.jerseys
                          .map(({ jersey, count }) => formatJerseyChip(jersey, count))
                          .join(", ")}
                        {row.withoutJersey > 0
                          ? ` · ${row.withoutJersey} sin dorsal`
                          : ""}
                      </span>
                    ) : (
                      <span className="w-full text-xs text-muted-foreground">Sin dorsales</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="ropa-panel__block flex flex-col gap-4">
              <FormTextarea
                label="Notas (opcional)"
                name="batch-notes"
                id="batch-notes"
                rows={2}
                maxLength={500}
                placeholder="Ej. Sobrante temporada 24/25"
                className="min-h-[4.5rem] resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <div className="rounded-[var(--radius-sm)] border border-[var(--ropa-line)] p-3">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-[var(--club-border)] accent-brand"
                    checked={assignBox}
                    onChange={(e) => {
                      setAssignBox(e.target.checked);
                      if (!e.target.checked) setBoxId("");
                    }}
                  />
                  <span className="text-sm font-medium text-foreground">Ubicar en caja ahora</span>
                </label>

                {assignBox ? (
                  boxes.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      No hay cajas en {formatSeasonShort(season)}. El stock quedará pendiente de
                      ubicar.
                    </p>
                  ) : (
                    <div className="mt-3 flex max-h-[min(40dvh,280px)] flex-col gap-2 overflow-y-auto overscroll-contain">
                      {boxes.map((box) => {
                        const home = homes.find((item) => item.box.id === box.id);
                        return (
                          <WarehouseCrate
                            key={box.id}
                            variant="pick"
                            selected={boxId === box.id}
                            onSelect={() => setBoxId(box.id)}
                            code={box.code}
                            label={box.label}
                            home={home ? boxHomeLabel(home) : undefined}
                          />
                        );
                      })}
                    </div>
                  )
                ) : null}
              </div>
            </div>
          </section>

          <div className="clothing-toolbar hidden border-t border-[var(--club-border)] pt-6 md:flex">
            <Button type="button" disabled={pending} onClick={handleConfirm}>
              {pending ? "Guardando…" : "Confirmar y guardar"}
            </Button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
              onClick={() => setStep("compose")}
              disabled={pending}
            >
              Volver a componer
            </button>
          </div>

          <ClothingStickyActionBar
            layout="split"
            actions={[
              {
                type: "button",
                label: "Atrás",
                onClick: () => setStep("compose"),
                disabled: pending,
                variant: "secondary",
                primacy: "leading",
              },
              {
                type: "button",
                label: pending ? "Guardando…" : "Confirmar y guardar",
                onClick: handleConfirm,
                pending,
                primacy: "primary",
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
