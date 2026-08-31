"use client";

import { MoreHorizontal, Plus, Shirt, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/club/Badge";
import { Button } from "@/components/club/Button";
import { Input } from "@/components/club/Input";
import { Label } from "@/components/club/Label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/club/Table";
import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import {
  createClothingProduct,
  deleteClothingProduct,
  setClothingProductActive,
  updateClothingProduct,
} from "@/lib/actions/clothing/products";
import { getCurrentSeason } from "@/lib/season";
import {
  CLOTHING_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
} from "@/lib/clothing/constants";
import type { ClothingProduct, ClothingProductCategory } from "@/lib/types/db";
import { cn } from "@/lib/utils";

type FormState = {
  mode: "create" | "edit";
  id?: string;
  name: string;
  category: ClothingProductCategory;
  season: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  mode: "create",
  name: "",
  category: "shirt",
  season: getCurrentSeason(),
  notes: "",
});

function ProductCategoryBadge({ category }: { category: ClothingProductCategory }) {
  return (
    <Badge variant="secondary" className="text-[11px]">
      {PRODUCT_CATEGORY_LABELS[category]}
    </Badge>
  );
}

export function ProductsPageClient({ products }: { products: ClothingProduct[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClothingProduct | null>(null);

  function openCreate() {
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(product: ClothingProduct) {
    setForm({
      mode: "edit",
      id: product.id,
      name: product.name,
      category: product.category,
      season: product.season,
      notes: product.notes ?? "",
    });
    setMenuId(null);
    setFormOpen(true);
  }

  function submitForm() {
    startTransition(async () => {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        season: form.season.trim(),
        notes: form.notes.trim() || undefined,
      };

      const result =
        form.mode === "create"
          ? await createClothingProduct(payload)
          : await updateClothingProduct({ ...payload, id: form.id! });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(form.mode === "create" ? "Prenda creada" : "Prenda actualizada");
      setFormOpen(false);
      router.refresh();
    });
  }

  function toggleActive(product: ClothingProduct) {
    setMenuId(null);
    startTransition(async () => {
      const result = await setClothingProductActive(product.id, !product.is_active);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(product.is_active ? "Prenda desactivada" : "Prenda activada");
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteClothingProduct(deleteTarget.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Prenda eliminada");
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
                      <p className="font-semibold text-foreground">{product.name}</p>
                      {!product.is_active ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Inactiva
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <ProductCategoryBadge category={product.category} />
                      <span className="text-xs text-muted-foreground">{product.season}</span>
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
                      aria-label={`Opciones de ${product.name}`}
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
                          onClick={() => toggleActive(product)}
                        >
                          {product.is_active ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2.5 text-left text-sm text-destructive hover:bg-[var(--club-surface-hover)]"
                          onClick={() => {
                            setMenuId(null);
                            setDeleteTarget(product);
                          }}
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
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Temporada</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[8rem]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} className={cn(!product.is_active && "opacity-60")}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
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
                      <TableCell className="tabular-nums text-muted-foreground">
                        {product.season}
                      </TableCell>
                      <TableCell>
                        {product.is_active ? (
                          <Badge variant="secondary" className="text-[11px]">
                            Activa
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[11px]">
                            Inactiva
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="min-h-9"
                            onClick={() => openEdit(product)}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="min-h-9"
                            onClick={() => toggleActive(product)}
                          >
                            {product.is_active ? "Desactivar" : "Activar"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="min-h-9 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(product)}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
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
        title={form.mode === "create" ? "Nueva prenda" : "Editar prenda"}
        description="Las prendas activas aparecen al crear pedidos a proveedor."
        primaryAction={{
          label: form.mode === "create" ? "Crear prenda" : "Guardar cambios",
          pending,
          onClick: submitForm,
        }}
        secondaryAction={{
          label: "Cancelar",
          onClick: () => setFormOpen(false),
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="product-name">Nombre</Label>
            <Input
              id="product-name"
              className="min-h-11"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Camiseta competición"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="product-category">Categoría</Label>
              <select
                id="product-category"
                className="form-input min-h-11"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    category: e.target.value as ClothingProductCategory,
                  }))
                }
              >
                {CLOTHING_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {PRODUCT_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="product-season">Temporada</Label>
              <Input
                id="product-season"
                className="min-h-11"
                value={form.season}
                onChange={(e) => setForm((f) => ({ ...f, season: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="product-notes">Notas</Label>
            <Input
              id="product-notes"
              className="min-h-11"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Opcional"
            />
          </div>
        </div>
      </ClothingBottomSheet>

      <ClothingBottomSheet
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar prenda"
        description={
          deleteTarget
            ? `¿Eliminar «${deleteTarget.name}»? Solo es posible si no tiene pedidos ni stock.`
            : undefined
        }
        primaryAction={{
          label: "Eliminar",
          variant: "destructive",
          pending,
          onClick: confirmDelete,
        }}
        secondaryAction={{
          label: "Cancelar",
          onClick: () => setDeleteTarget(null),
        }}
      />

      <ClothingStickyActionBar
        actions={[{ type: "button", label: "Nueva prenda", onClick: openCreate }]}
      />
    </>
  );
}
