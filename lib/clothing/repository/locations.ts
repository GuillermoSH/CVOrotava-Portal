import type { ClothingDb } from "@/lib/clothing/repository/client";
import { dbErrorMessage } from "@/lib/clothing/repository/helpers";
import { mapLocation } from "@/lib/clothing/repository/mappers";
import type { ClothingLocationType, ClothingStorageLocation } from "@/lib/types/db";

export async function listLocations(
  db: ClothingDb,
  season?: string,
): Promise<ClothingStorageLocation[]> {
  let query = db.from("clothing_storage_locations").select("*").order("label", { ascending: true });
  if (season) query = query.eq("season", season);

  const { data, error } = await query;
  if (error) throw new Error(dbErrorMessage(error));
  return (data ?? []).map(mapLocation);
}

export async function getLocationById(
  db: ClothingDb,
  id: string,
): Promise<ClothingStorageLocation | null> {
  const { data, error } = await db
    .from("clothing_storage_locations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(dbErrorMessage(error));
  return data ? mapLocation(data) : null;
}

export async function findLocationByCodeSeason(
  db: ClothingDb,
  code: string,
  season: string,
  excludeId?: string,
): Promise<ClothingStorageLocation | null> {
  let query = db
    .from("clothing_storage_locations")
    .select("*")
    .eq("code", code)
    .eq("season", season);

  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(dbErrorMessage(error));
  return data ? mapLocation(data) : null;
}

export async function locationHasChildren(db: ClothingDb, id: string): Promise<boolean> {
  const { count, error } = await db
    .from("clothing_storage_locations")
    .select("*", { count: "exact", head: true })
    .eq("parent_id", id);

  if (error) throw new Error(dbErrorMessage(error));
  return (count ?? 0) > 0;
}

export async function locationHasStock(db: ClothingDb, id: string): Promise<boolean> {
  const { count, error } = await db
    .from("clothing_inventory_lots")
    .select("*", { count: "exact", head: true })
    .eq("storage_location_id", id);

  if (error) throw new Error(dbErrorMessage(error));
  return (count ?? 0) > 0;
}

export function validateLocationHierarchy(
  locationType: ClothingLocationType,
  parentId: string | null,
  parent: ClothingStorageLocation | null,
): string | null {
  if (locationType === "cabinet" && parentId) {
    return "Un armario no puede tener padre";
  }
  if (locationType === "shelf") {
    if (!parentId || !parent) return "La balda debe estar bajo un armario";
    if (parent.location_type !== "cabinet") return "La balda debe estar bajo un armario";
  }
  if (locationType === "box" && parentId) {
    if (!parent) return "Ubicación padre no encontrada";
    if (parent.location_type !== "cabinet" && parent.location_type !== "shelf") {
      return "La caja debe estar suelta o dentro de un armario";
    }
  }
  return null;
}

export async function createLocation(
  db: ClothingDb,
  input: {
    parent_id: string | null;
    location_type: ClothingLocationType;
    label: string;
    code: string;
    season: string;
    notes?: string | null;
  },
): Promise<ClothingStorageLocation> {
  const { data, error } = await db
    .from("clothing_storage_locations")
    .insert({
      parent_id: input.parent_id,
      location_type: input.location_type,
      label: input.label.trim(),
      code: input.code.trim(),
      season: input.season.trim(),
      notes: input.notes ?? null,
      sort_order: 0,
    })
    .select("*")
    .single();

  if (error) throw new Error(dbErrorMessage(error));
  return mapLocation(data);
}

export async function updateLocation(
  db: ClothingDb,
  input: {
    id: string;
    parent_id: string | null;
    location_type: ClothingLocationType;
    label: string;
    code: string;
    season: string;
    notes?: string | null;
  },
): Promise<ClothingStorageLocation> {
  const { data, error } = await db
    .from("clothing_storage_locations")
    .update({
      parent_id: input.parent_id,
      location_type: input.location_type,
      label: input.label.trim(),
      code: input.code.trim(),
      season: input.season.trim(),
      notes: input.notes ?? null,
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) throw new Error(dbErrorMessage(error));
  return mapLocation(data);
}

export async function deleteLocation(db: ClothingDb, id: string): Promise<void> {
  const { error } = await db.from("clothing_storage_locations").delete().eq("id", id);
  if (error) throw new Error(dbErrorMessage(error));
}

export async function deleteLocationsByIds(db: ClothingDb, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await db.from("clothing_storage_locations").delete().in("id", ids);
  if (error) throw new Error(dbErrorMessage(error));
}

export async function listBoxLocations(db: ClothingDb): Promise<ClothingStorageLocation[]> {
  const { data, error } = await db
    .from("clothing_storage_locations")
    .select("*")
    .eq("location_type", "box")
    .order("label", { ascending: true });

  if (error) throw new Error(dbErrorMessage(error));
  return (data ?? []).map(mapLocation);
}
