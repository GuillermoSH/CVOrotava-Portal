"use server";

import { revalidatePath } from "next/cache";

import { requireClothingWriteAccess } from "@/lib/clothing/auth";
import { getClothingDb } from "@/lib/clothing/repository/client";
import {
  createProduct,
  deleteProduct,
  findDuplicateProduct,
  getProductById,
  productUsedInInventory,
  productUsedInOrders,
  updateProduct,
} from "@/lib/clothing/repository/products";
import { createProductSchema, updateProductSchema } from "@/lib/clothing/schemas";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

const CLOTHING_PRODUCT_PATHS = [
  "/admin/ropa",
  "/admin/ropa/prendas",
  "/admin/ropa/pedidos",
  "/admin/ropa/pedidos/nuevo",
  "/admin/ropa/almacen",
];

function revalidateProducts() {
  for (const path of CLOTHING_PRODUCT_PATHS) {
    revalidatePath(path, "layout");
  }
}

const DUPLICATE_ERROR =
  "Ya existe una prenda con esa marca, modelo, color y categoría en la temporada";

export async function createClothingProduct(input: unknown): Promise<ActionResult> {
  try {
    await requireClothingWriteAccess();
    const parsed = createProductSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getClothingDb();
    const { model, brand, category, color, season, notes, is_shop_item } = parsed.data;
    const duplicate = await findDuplicateProduct(db, model, brand, color, category, season);
    if (duplicate) {
      return { ok: false, error: DUPLICATE_ERROR };
    }

    const product = await createProduct(db, {
      model,
      brand,
      category,
      color,
      season,
      notes,
      is_shop_item,
    });
    revalidateProducts();
    return { ok: true, id: product.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

export async function updateClothingProduct(input: unknown): Promise<ActionResult> {
  try {
    await requireClothingWriteAccess();
    const parsed = updateProductSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getClothingDb();
    const { id, model, brand, category, color, season, notes, is_shop_item, is_active } =
      parsed.data;
    const existing = await getProductById(db, id);
    if (!existing) return { ok: false, error: "Prenda no encontrada" };

    const duplicate = await findDuplicateProduct(db, model, brand, color, category, season, id);
    if (duplicate) {
      return { ok: false, error: DUPLICATE_ERROR };
    }

    await updateProduct(db, {
      id,
      model,
      brand,
      category,
      color,
      season,
      notes,
      is_shop_item,
      is_active,
    });
    revalidateProducts();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

export async function setClothingProductActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  try {
    await requireClothingWriteAccess();
    const db = await getClothingDb();
    const product = await getProductById(db, id);
    if (!product) return { ok: false, error: "Prenda no encontrada" };

    await updateProduct(db, {
      id,
      model: product.model,
      brand: product.brand,
      category: product.category,
      color: product.color,
      season: product.season,
      notes: product.notes,
      is_shop_item: product.is_shop_item,
      is_active: isActive,
    });

    revalidateProducts();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

export async function deleteClothingProduct(id: string): Promise<ActionResult> {
  try {
    await requireClothingWriteAccess();
    const db = await getClothingDb();

    if (await productUsedInOrders(db, id)) {
      return {
        ok: false,
        error: "No se puede eliminar: la prenda aparece en pedidos. Desactívala en su lugar.",
      };
    }

    if (await productUsedInInventory(db, id)) {
      return {
        ok: false,
        error: "No se puede eliminar: hay stock asociado. Desactívala en su lugar.",
      };
    }

    const product = await getProductById(db, id);
    if (!product) return { ok: false, error: "Prenda no encontrada" };

    await deleteProduct(db, id);
    revalidateProducts();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}
