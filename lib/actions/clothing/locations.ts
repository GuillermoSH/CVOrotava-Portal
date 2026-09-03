"use server";

import { revalidatePath } from "next/cache";

import { requireClothingWriteAccess } from "@/lib/clothing/auth";
import { getClothingDb } from "@/lib/clothing/repository/client";
import {
  createLocation,
  deleteLocation,
  findLocationByCodeSeason,
  getLocationById,
  locationHasChildren,
  locationHasStock,
  updateLocation,
  validateLocationHierarchy,
} from "@/lib/clothing/repository/locations";
import {
  createLocationSchema,
  moveLocationSchema,
  updateLocationSchema,
} from "@/lib/clothing/schemas";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function revalidateLocations() {
  revalidatePath("/admin/ropa/almacen/ubicaciones", "layout");
  revalidatePath("/admin/ropa/almacen");
}

export async function createStorageLocation(input: unknown): Promise<ActionResult> {
  try {
    await requireClothingWriteAccess();
    const parsed = createLocationSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getClothingDb();
    const { parent_id, location_type, label, code, season, notes } = parsed.data;

    const parent = parent_id ? await getLocationById(db, parent_id) : null;
    if (parent_id && !parent) return { ok: false, error: "Ubicación padre no encontrada" };

    const hierarchyError = validateLocationHierarchy(location_type, parent_id, parent);
    if (hierarchyError) return { ok: false, error: hierarchyError };

    const duplicate = await findLocationByCodeSeason(db, code, season);
    if (duplicate) return { ok: false, error: "Ya existe una ubicación con ese código" };

    const location = await createLocation(db, {
      parent_id,
      location_type,
      label,
      code,
      season,
      notes,
    });

    revalidateLocations();
    return { ok: true, id: location.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

export async function updateStorageLocation(input: unknown): Promise<ActionResult> {
  try {
    await requireClothingWriteAccess();
    const parsed = updateLocationSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getClothingDb();
    const { id, parent_id, location_type, label, code, season, notes } = parsed.data;

    const existing = await getLocationById(db, id);
    if (!existing) return { ok: false, error: "Ubicación no encontrada" };

    const parent = parent_id ? await getLocationById(db, parent_id) : null;
    if (parent_id && !parent) return { ok: false, error: "Ubicación padre no encontrada" };

    const hierarchyError = validateLocationHierarchy(location_type, parent_id, parent);
    if (hierarchyError) return { ok: false, error: hierarchyError };

    const duplicate = await findLocationByCodeSeason(db, code, season, id);
    if (duplicate) return { ok: false, error: "Ya existe una ubicación con ese código" };

    await updateLocation(db, {
      id,
      parent_id,
      location_type,
      label,
      code,
      season,
      notes,
    });

    revalidateLocations();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

export async function moveStorageLocation(input: unknown): Promise<ActionResult> {
  try {
    await requireClothingWriteAccess();
    const parsed = moveLocationSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getClothingDb();
    const { id, parent_id } = parsed.data;

    const existing = await getLocationById(db, id);
    if (!existing) return { ok: false, error: "Ubicación no encontrada" };
    if (existing.location_type !== "box") {
      return { ok: false, error: "Solo se pueden mover cajas" };
    }

    const parent = parent_id ? await getLocationById(db, parent_id) : null;
    if (parent_id && !parent) return { ok: false, error: "Ubicación padre no encontrada" };

    const hierarchyError = validateLocationHierarchy("box", parent_id, parent);
    if (hierarchyError) return { ok: false, error: hierarchyError };

    await updateLocation(db, {
      id,
      parent_id,
      location_type: existing.location_type,
      label: existing.label,
      code: existing.code,
      season: existing.season,
      notes: existing.notes,
    });

    revalidateLocations();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

export async function deleteStorageLocation(id: string): Promise<ActionResult> {
  try {
    await requireClothingWriteAccess();
    const db = await getClothingDb();

    if (await locationHasChildren(db, id)) {
      return { ok: false, error: "Elimina primero las ubicaciones hijas" };
    }

    if (await locationHasStock(db, id)) {
      return { ok: false, error: "Hay stock asignado a esta ubicación" };
    }

    const existing = await getLocationById(db, id);
    if (!existing) return { ok: false, error: "Ubicación no encontrada" };

    await deleteLocation(db, id);
    revalidateLocations();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}
