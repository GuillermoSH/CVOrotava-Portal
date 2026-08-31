"use server";

import { revalidatePath } from "next/cache";

import { requireClothingWriteAccess } from "@/lib/clothing/auth";
import { getClothingDb } from "@/lib/clothing/repository/client";
import {
  assignLotToLocation,
  createManualInventoryLot,
  getLotById,
} from "@/lib/clothing/repository/inventory";
import { getLocationById } from "@/lib/clothing/repository/locations";
import { getProductById } from "@/lib/clothing/repository/products";
import {
  assignInventorySchema,
  createManualInventorySchema,
} from "@/lib/clothing/schemas";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

const CLOTHING_PATHS = [
  "/admin/ropa",
  "/admin/ropa/almacen",
];

function revalidateClothing() {
  for (const path of CLOTHING_PATHS) {
    revalidatePath(path, "layout");
  }
}

export async function assignInventoryToLocation(input: unknown): Promise<ActionResult> {
  try {
    await requireClothingWriteAccess();
    const parsed = assignInventorySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getClothingDb();
    const { lot_id, storage_location_id } = parsed.data;

    const lot = await getLotById(db, lot_id);
    if (!lot) return { ok: false, error: "Lote no encontrado" };
    if (lot.status !== "pending_storage") {
      return { ok: false, error: "Este lote ya tiene ubicación asignada" };
    }

    const location = await getLocationById(db, storage_location_id);
    if (!location) return { ok: false, error: "Ubicación no encontrada" };
    if (location.location_type !== "box") {
      return { ok: false, error: "Solo se puede asignar stock a una caja" };
    }

    await assignLotToLocation(db, lot_id, storage_location_id);
    revalidateClothing();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

export async function createManualInventoryLotAction(input: unknown): Promise<ActionResult> {
  try {
    await requireClothingWriteAccess();
    const parsed = createManualInventorySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getClothingDb();
    const { product_id, size, quantity, storage_location_id, notes } = parsed.data;

    const product = await getProductById(db, product_id);
    if (!product) return { ok: false, error: "Prenda no encontrada" };
    if (!product.is_active) return { ok: false, error: "La prenda no está activa" };

    if (storage_location_id) {
      const location = await getLocationById(db, storage_location_id);
      if (!location) return { ok: false, error: "Ubicación no encontrada" };
      if (location.location_type !== "box") {
        return { ok: false, error: "Solo se puede asignar stock a una caja" };
      }
    }

    const lot = await createManualInventoryLot(db, {
      product_id,
      size,
      quantity,
      storage_location_id: storage_location_id ?? null,
      notes,
    });

    revalidateClothing();
    return { ok: true, id: lot.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}
