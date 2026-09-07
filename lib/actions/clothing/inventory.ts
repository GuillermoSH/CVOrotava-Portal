"use server";

import { revalidatePath } from "next/cache";

import { requireClothingWriteAccess } from "@/lib/clothing/auth";
import { getClothingDb } from "@/lib/clothing/repository/client";
import {
  applyStockOutLines,
  assignJerseyNumbers,
  assignLotToLocation,
  createManualInventoryLot,
  getLotById,
} from "@/lib/clothing/repository/inventory";
import { getLocationById } from "@/lib/clothing/repository/locations";
import { getPlayerById } from "@/lib/clothing/repository/players";
import { getProductById } from "@/lib/clothing/repository/products";
import {
  assignInventorySchema,
  assignJerseyNumbersSchema,
  createManualInventorySchema,
  deliverInventorySchema,
  writeOffInventorySchema,
} from "@/lib/clothing/schemas";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

const CLOTHING_PATHS = [
  "/admin/ropa",
  "/admin/ropa/almacen",
  "/admin/ropa/entregas",
  "/admin/ropa/almacen/entregas",
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
    const { product_id, size, quantity, storage_location_id, notes, jersey_number } = parsed.data;

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
      quantity: jersey_number == null ? quantity : 1,
      storage_location_id: storage_location_id ?? null,
      notes,
      jersey_number: jersey_number ?? null,
    });

    revalidateClothing();
    return { ok: true, id: lot.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

async function currentUserId(db: Awaited<ReturnType<typeof getClothingDb>>): Promise<string | null> {
  const { data } = await db.auth.getUser();
  return data.user?.id ?? null;
}

export async function deliverInventoryAction(input: unknown): Promise<ActionResult> {
  try {
    await requireClothingWriteAccess();
    const parsed = deliverInventorySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getClothingDb();
    const player = await getPlayerById(db, parsed.data.player_id);
    if (!player) return { ok: false, error: "Jugador no encontrado" };
    if (!player.is_active) return { ok: false, error: "El jugador no está activo" };

    await applyStockOutLines(db, {
      kind: "delivery",
      player_id: player.id,
      recipient_name: player.full_name,
      notes: parsed.data.notes,
      created_by: await currentUserId(db),
      lines: parsed.data.lines.map((line) => ({
        productId: line.product_id,
        size: line.size,
        storageLocationId: line.storage_location_id,
        quantity: line.quantity,
        jerseyNumber: line.jersey_number ?? null,
      })),
    });

    revalidateClothing();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

export async function writeOffInventoryAction(input: unknown): Promise<ActionResult> {
  try {
    await requireClothingWriteAccess();
    const parsed = writeOffInventorySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const locationId = parsed.data.storage_location_id;
    for (const line of parsed.data.lines) {
      if (line.storage_location_id !== locationId) {
        return { ok: false, error: "Todas las líneas deben ser de la misma caja" };
      }
    }

    const db = await getClothingDb();
    if (locationId) {
      const location = await getLocationById(db, locationId);
      if (!location) return { ok: false, error: "Caja no encontrada" };
      if (location.location_type !== "box") {
        return { ok: false, error: "Solo se puede eliminar stock de una caja" };
      }
    }

    await applyStockOutLines(db, {
      kind: "write_off",
      notes: parsed.data.notes,
      created_by: await currentUserId(db),
      lines: parsed.data.lines.map((line) => ({
        productId: line.product_id,
        size: line.size,
        storageLocationId: line.storage_location_id,
        quantity: line.quantity,
        jerseyNumber: line.jersey_number ?? null,
      })),
    });

    revalidateClothing();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

export async function assignJerseyNumbersAction(input: unknown): Promise<ActionResult> {
  try {
    await requireClothingWriteAccess();
    const parsed = assignJerseyNumbersSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const unique = new Set(parsed.data.jersey_numbers);
    if (unique.size !== parsed.data.jersey_numbers.length) {
      return { ok: false, error: "Hay dorsales repetidos" };
    }

    const db = await getClothingDb();
    const lot = await getLotById(db, parsed.data.lot_id);
    if (!lot) return { ok: false, error: "Lote no encontrado" };
    if (lot.jersey_number != null) return { ok: false, error: "Este lote ya tiene dorsal" };
    if (parsed.data.jersey_numbers.length > lot.quantity) {
      return { ok: false, error: "Hay más dorsales que unidades en el lote" };
    }

    await assignJerseyNumbers(db, lot.id, parsed.data.jersey_numbers);
    revalidateClothing();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}
