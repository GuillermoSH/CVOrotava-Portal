"use client";

import { Copy, MoreHorizontal, Pencil, Plus, Power, PowerOff, Shirt, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/club/Badge";
import { Button } from "@/components/club/Button";
import { ConfirmDialog } from "@/components/club/ConfirmDialog";
import { FormInput, FormSelect, FormTextarea } from "@/components/club/forms";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/club/Table";
import { TableActionsCell, TableIconAction } from "@/components/club/TableActions";
import { TableRowInteractive } from "@/components/club/TableRowInteractive";
import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import { ProductColorBadge } from "@/components/clothing/ProductColorBadge";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import {
  createClothingProduct,
  deleteClothingProduct,
  setClothingProductActive,
  updateClothingProduct,
} from "@/lib/actions/clothing/products";
import {
  CLOTHING_BRANDS,
  CLOTHING_BRAND_LABELS,
  CLOTHING_CATEGORIES,
  CLOTHING_COLORS,
  CLOTHING_COLOR_LABELS,
  PRODUCT_CATEGORY_LABELS,
} from "@/lib/clothing/constants";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import { formatSeasonShort, getCurrentSeason, getSeasonSelectOptions } from "@/lib/season";
import {
  toFieldError,
  validateProductFormInput,
  type ProductFormField,
  type ProductFormFieldErrors,
} from "@/lib/clothing/validateProductForm";
import type {
  ClothingProduct,
  ClothingProductBrand,
  ClothingProductCategory,
  ClothingProductColor,
} from "@/lib/types/db";
import { cn } from "@/lib/utils";
import { appToast } from "@/lib/toast";

type FormState = {
  mode: "create" | "edit" | "duplicate";
  id?: string;
  duplicateFromLabel?: string;
  brand: ClothingProductBrand;
  model: string;
  category: ClothingProductCategory;
  color: ClothingProductColor;
  season: string;
  notes: string;
  is_shop_item: boolean;
};

const emptyForm = (): FormState => ({
  mode: "create",
  brand: "hummel",
  model: "",
  category: "shirt_competition",
  color: "blanco",
  season: getCurrentSeason(),
  notes: "",
  is_shop_item: false,
});

function formFromProduct(
  product: ClothingProduct,
  mode: "edit" | "duplicate",
): FormState {
  return {
    mode,
    id: mode === "edit" ? product.id : undefined,
    duplicateFromLabel:
      mode === "duplicate" ? formatProductShort(product) : undefined,
    brand: product.brand,
    model: product.model,
    category: product.category,
    color: product.color,
    season: product.season,
    notes: product.notes ?? "",
    is_shop_item: product.is_shop_item,
  };
}

function duplicateLabelFromForm(form: FormState): string {
  return formatProductShort({
    brand: form.brand,
    model: form.model.trim() || "…",
    color: form.color,
  });
}

function ProductBrandBadge({ brand }: { brand: ClothingProductBrand }) {
  return (
    <Badge variant="secondary" className="text-[11px]">
      {CLOTHING_BRAND_LABELS[brand]}
    </Badge>
  );
}

function ProductCategoryBadge({ category }: { category: ClothingProductCategory }) {
  return (
    <Badge variant="secondary" className="text-[11px]">
      {PRODUCT_CATEGORY_LABELS[category]}
    </Badge>
  );
}

function ProductShopBadge() {
  return (
    <Badge variant="info" className="text-[11px]">
      Tienda
    </Badge>
  );
}

export function ProductsPageClient({ products }: { products: ClothingProduct[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<ProductFormFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClothingProduct | null>(null);

  const seasonOptions = useMemo(
    () => getSeasonSelectOptions(form.season ? [form.season] : []),
    [form.season],
  );

  function resetForm(next: FormState) {
    setForm(next);
    setFieldErrors({});
    setFormError(null);
  }

  function clearFieldError(field: ProductFormField) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError(null);
  }

  function openCreate() {
    resetForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(product: ClothingProduct) {
    resetForm(formFromProduct(product, "edit"));
    setMenuId(null);
    setFormOpen(true);
  }

  function openDuplicate(product: ClothingProduct) {
    resetForm(formFromProduct(product, "duplicate"));
    setMenuId(null);
    setFormOpen(true);
  }

  function switchEditToDuplicate() {
    setForm((current) => ({
      ...current,
      mode: "duplicate",
      id: undefined,
      duplicateFromLabel: duplicateLabelFromForm(current),
    }));
  }

  function submitForm() {
    const payload = {
      brand: form.brand,
      model: form.model.trim(),
      category: form.category,
      color: form.color,
      season: form.season.trim(),
      notes: form.notes.trim() || undefined,
      is_shop_item: form.is_shop_item,
    };

    const validation = validateProductFormInput(payload);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      setFormError("Revisa los campos marcados antes de continuar.");
      return;
    }

    setFieldErrors({});
    setFormError(null);

    startTransition(async () => {
      const result =
        form.mode === "edit"
          ? await updateClothingProduct({ ...validation.data, id: form.id! })
          : await createClothingProduct(validation.data);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      appToast.success(
        form.mode === "edit"
          ? "Prenda actualizada"
          : form.mode === "duplicate"
            ? "Prenda duplicada"
            : "Prenda creada",
      );
      setFormOpen(false);
      router.refresh();
    });
  }

  function toggleActive(product: ClothingProduct) {
    setMenuId(null);
    startTransition(async () => {
      const result = await setClothingProductActive(product.id, !product.is_active);
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success(product.is_active ? "Prenda desactivada" : "Prenda activada");
      router.refresh();
    });
  }

  function requestDelete(product: ClothingProduct) {
    setMenuId(null);
    setDeleteTarget(product);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteClothingProduct(deleteTarget.id);
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success("Prenda eliminada");
      setDeleteTarget(null);
      router.refresh();
    });
  }

  const activeCount = products.filter((p) => p.is_active).length;

  return (
    <>
      <div className="clothing-page-with-sticky flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {activeCount} activa{activeCount === 1 ? "" : "s"} · {products.length} total
          </p>
          <div className="hidden md:block">
            <Button type="button" className="min-h-11" onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              Nueva prenda
            </Button>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--club-border)] px-6 py-10 text-center">
            <Shirt className="mx-auto size-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-medium text-foreground">Sin prendas configuradas</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Añade camisetas, pantalones y otras piezas para usarlas al crear pedidos.
            </p>
            <div className="mt-5 hidden md:block">
              <Button type="button" className="min-h-11" onClick={openCreate}>
                <Plus className="size-4" aria-hidden />
                Nueva prenda
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2.5 md:hidden">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={cn(
                    "clothing-list-card flex items-start justify-between gap-3",
                    !product.is_active && "opacity-60",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{formatProductShort(product)}</p>
                      {!product.is_active ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Inactiva
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <ProductBrandBadge brand={product.brand} />
                      <ProductCategoryBadge category={product.category} />
                      {product.is_shop_item ? <ProductShopBadge /> : null}
                      <span className="text-xs text-muted-foreground">
                        {formatSeasonShort(product.season)}
                      </span>
                    </div>
                    {product.notes ? (
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                        {product.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="relative shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-11 min-w-11"
                      aria-label={`Opciones de ${formatProductShort(product)}`}
                      onClick={() => setMenuId(menuId === product.id ? null : product.id)}
                    >
                      <MoreHorizontal className="size-4" aria-hidden />
                    </Button>
                    {menuId === product.id ? (
                      <div className="absolute right-0 top-full z-10 mt-1 min-w-[10rem] rounded-lg border border-[var(--club-border)] bg-[var(--club-surface)] py-1 shadow-lg">
                        <button
                          type="button"
                          className="block w-full px-3 py-2.5 text-left text-sm hover:bg-[var(--club-surface-hover)]"
                          onClick={() => openEdit(product)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2.5 text-left text-sm hover:bg-[var(--club-surface-hover)]"
                          onClick={() => openDuplicate(product)}
                        >
                          Duplicar
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2.5 text-left text-sm hover:bg-[var(--club-surface-hover)]"
                          onClick={() => toggleActive(product)}
                        >
                          {product.is_active ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2.5 text-left text-sm text-destructive hover:bg-[var(--club-surface-hover)]"
                          onClick={() => requestDelete(product)}
                        >
                          Eliminar
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block">
              <div className="glass-panel overflow-hidden">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marca</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Temporada</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="club-table__actions">
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRowInteractive
                      key={product.id}
                      className={cn(!product.is_active && "opacity-60")}
                      onActivate={() => openEdit(product)}
                    >
                      <TableCell>
                        <ProductBrandBadge brand={product.brand} />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="club-table__primary">{product.model}</p>
                          {product.notes ? (
                            <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">
                              {product.notes}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ProductCategoryBadge category={product.category} />
                      </TableCell>
                      <TableCell>
                        <ProductColorBadge color={product.color} />
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatSeasonShort(product.season)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {product.is_active ? (
                            <Badge variant="secondary" className="text-[11px]">
                              Activa
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[11px]">
                              Inactiva
                            </Badge>
                          )}
                          {product.is_shop_item ? <ProductShopBadge /> : null}
                        </div>
                      </TableCell>
                      <TableActionsCell>
                        <TableIconAction
                          label="Editar"
                          icon={Pencil}
                          onClick={() => openEdit(product)}
                        />
                        <TableIconAction
                          label="Duplicar"
                          icon={Copy}
                          onClick={() => openDuplicate(product)}
                        />
                        <TableIconAction
                          label={product.is_active ? "Desactivar" : "Activar"}
                          icon={product.is_active ? PowerOff : Power}
                          onClick={() => toggleActive(product)}
                        />
                        <TableIconAction
                          label="Eliminar"
                          icon={Trash2}
                          destructive
                          onClick={() => requestDelete(product)}
                        />
                      </TableActionsCell>
                    </TableRowInteractive>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          </>
        )}
      </div>

      <ClothingBottomSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={
          form.mode === "edit"
            ? "Editar prenda"
            : form.mode === "duplicate"
              ? "Duplicar prenda"
              : "Nueva prenda"
        }
        description={
          form.mode === "duplicate"
            ? `Copia de «${form.duplicateFromLabel}». Ajusta lo que necesites y créala como nueva.`
            : "Las prendas activas aparecen al crear pedidos a proveedor."
        }
        primaryAction={{
          label:
            form.mode === "edit"
              ? "Guardar cambios"
              : form.mode === "duplicate"
                ? "Crear copia"
                : "Crear prenda",
          pending,
          onClick: submitForm,
        }}
        secondaryAction={{
          label: "Cancelar",
          onClick: () => setFormOpen(false),
        }}
      >
        <div className="flex flex-col gap-4">
          {formError ? (
            <div
              className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              role="alert"
            >
              {formError}
            </div>
          ) : null}
          {form.mode === "edit" ? (
            <button
              type="button"
              className="inline-flex min-h-10 w-fit items-center gap-2 text-sm font-medium text-brand transition-colors hover:text-brand/80"
              onClick={switchEditToDuplicate}
            >
              <Copy className="size-4" aria-hidden />
              Duplicar como nueva prenda
            </button>
          ) : null}
          <FormSelect
            label="Marca"
            name="product-brand"
            id="product-brand"
            value={form.brand}
            error={toFieldError(fieldErrors.brand)}
            onChange={(e) => {
              clearFieldError("brand");
              setForm((f) => ({
                ...f,
                brand: e.target.value as ClothingProductBrand,
              }));
            }}
            options={CLOTHING_BRANDS.map((brand) => ({
              value: brand,
              label: CLOTHING_BRAND_LABELS[brand],
            }))}
          />
          <FormInput
            label="Modelo"
            name="product-model"
            id="product-model"
            className="min-h-11"
            value={form.model}
            error={toFieldError(fieldErrors.model)}
            onChange={(e) => {
              clearFieldError("model");
              setForm((f) => ({ ...f, model: e.target.value }));
            }}
            placeholder="Essential Jersey S/S"
          />
          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Categoría"
              name="product-category"
              id="product-category"
              value={form.category}
              error={toFieldError(fieldErrors.category)}
              onChange={(e) => {
                clearFieldError("category");
                setForm((f) => ({
                  ...f,
                  category: e.target.value as ClothingProductCategory,
                }));
              }}
              options={CLOTHING_CATEGORIES.map((cat) => ({
                value: cat,
                label: PRODUCT_CATEGORY_LABELS[cat],
              }))}
            />
            <FormSelect
              label="Color"
              name="product-color"
              id="product-color"
              value={form.color}
              error={toFieldError(fieldErrors.color)}
              onChange={(e) => {
                clearFieldError("color");
                setForm((f) => ({
                  ...f,
                  color: e.target.value as ClothingProductColor,
                }));
              }}
              options={CLOTHING_COLORS.map((color) => ({
                value: color,
                label: CLOTHING_COLOR_LABELS[color],
              }))}
            />
          </div>
          <FormSelect
            label="Temporada"
            name="product-season"
            id="product-season"
            value={form.season}
            error={toFieldError(fieldErrors.season)}
            onChange={(e) => {
              clearFieldError("season");
              setForm((f) => ({ ...f, season: e.target.value }));
            }}
            options={seasonOptions}
          />
          <div className="rounded-lg border border-[var(--club-border)] p-3">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 rounded border-[var(--club-border)] accent-brand"
                checked={form.is_shop_item}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is_shop_item: e.target.checked }))
                }
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">Artículo de tienda</span>
                <span className="text-xs text-muted-foreground">
                  Marca si se vende en la tienda del club además de la equipación de equipo.
                </span>
              </span>
            </label>
          </div>
          <FormTextarea
            label="Notas"
            name="product-notes"
            id="product-notes"
            className="min-h-[4.5rem] resize-none"
            value={form.notes}
            error={toFieldError(fieldErrors.notes)}
            onChange={(e) => {
              clearFieldError("notes");
              setForm((f) => ({ ...f, notes: e.target.value }));
            }}
            placeholder="Opcional"
            rows={2}
          />
        </div>
      </ClothingBottomSheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar prenda"
        description={
          deleteTarget
            ? `¿Eliminar «${formatProductShort(deleteTarget)}»? Solo es posible si no tiene pedidos ni stock.`
            : undefined
        }
        confirmLabel="Eliminar"
        destructive
        pending={pending}
        onConfirm={confirmDelete}
      />

      <ClothingStickyActionBar
        actions={[{ type: "button", label: "Nueva prenda", onClick: openCreate }]}
      />
    </>
  );
}
