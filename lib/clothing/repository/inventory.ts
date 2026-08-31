import type { ClothingDb } from "@/lib/clothing/repository/client";
import { dbErrorMessage } from "@/lib/clothing/repository/helpers";
import { mapLot, mapOrderLine } from "@/lib/clothing/repository/mappers";
import type { ClothingInventoryLot, ClothingSize } from "@/lib/types/db";

export async function listInventoryLots(db: ClothingDb): Promise<ClothingInventoryLot[]> {
  const { data, error } = await db
    .from("clothing_inventory_lots")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(dbErrorMessage(error));
  return (data ?? []).map(mapLot);
}

export async function getLotById(db: ClothingDb, id: string): Promise<ClothingInventoryLot | null> {
  const { data, error } = await db
    .from("clothing_inventory_lots")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(dbErrorMessage(error));
  return data ? mapLot(data) : null;
}

export async function assignLotToLocation(
  db: ClothingDb,
  lotId: string,
  storageLocationId: string,
): Promise<ClothingInventoryLot> {
  const { data, error } = await db
    .from("clothing_inventory_lots")
    .update({
      storage_location_id: storageLocationId,
      status: "stored",
      updated_at: new Date().toISOString(),
    })
    .eq("id", lotId)
    .select("*")
    .single();

  if (error) throw new Error(dbErrorMessage(error));
  return mapLot(data);
}

export async function createManualInventoryLot(
  db: ClothingDb,
  input: {
    product_id: string;
    size: ClothingSize;
    quantity: number;
    storage_location_id?: string | null;
    notes?: string | null;
  },
): Promise<ClothingInventoryLot> {
  const status = input.storage_location_id ? "stored" : "pending_storage";

  const { data, error } = await db
    .from("clothing_inventory_lots")
    .insert({
      product_id: input.product_id,
      size: input.size,
      quantity: input.quantity,
      status,
      storage_location_id: input.storage_location_id ?? null,
      source_type: "manual",
      source_order_id: null,
      source_line_id: null,
      returned_from_serigraphy_at: null,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(dbErrorMessage(error));
  return mapLot(data);
}

export async function createInventoryLotsFromOrder(
  db: ClothingDb,
  orderId: string,
): Promise<void> {
  const { data: lineRows, error: lineError } = await db
    .from("clothing_supplier_order_lines")
    .select("*")
    .eq("order_id", orderId);

  if (lineError) throw new Error(dbErrorMessage(lineError));

  const ts = new Date().toISOString();

  for (const row of lineRows ?? []) {
    const line = mapOrderLine(row);

    const { count, error: existsError } = await db
      .from("clothing_inventory_lots")
      .select("*", { count: "exact", head: true })
      .eq("source_line_id", line.id);

    if (existsError) throw new Error(dbErrorMessage(existsError));
    if ((count ?? 0) > 0) continue;

    const qty =
      line.quantity_received > 0 ? line.quantity_received : line.quantity_ordered;
    if (qty <= 0) continue;

    const { error: insertError } = await db.from("clothing_inventory_lots").insert({
      product_id: line.product_id,
      size: line.size,
      quantity: qty,
      status: "pending_storage",
      storage_location_id: null,
      source_type: "order",
      source_order_id: orderId,
      source_line_id: line.id,
      returned_from_serigraphy_at: ts,
      notes: null,
    });

    if (insertError) throw new Error(dbErrorMessage(insertError));
  }
}

export async function deleteLotsByIds(db: ClothingDb, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await db.from("clothing_inventory_lots").delete().in("id", ids);
  if (error) throw new Error(dbErrorMessage(error));
}
