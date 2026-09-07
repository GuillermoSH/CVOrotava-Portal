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
    jersey_number?: number | null;
  },
): Promise<ClothingInventoryLot> {
  const status = input.storage_location_id ? "stored" : "pending_storage";
  const jerseyNumber = input.jersey_number ?? null;

  const { data, error } = await db
    .from("clothing_inventory_lots")
    .insert({
      product_id: input.product_id,
      size: input.size,
      quantity: jerseyNumber == null ? input.quantity : 1,
      status,
      storage_location_id: input.storage_location_id ?? null,
      source_type: "manual",
      source_order_id: null,
      source_line_id: null,
      returned_from_serigraphy_at: null,
      notes: input.notes?.trim() || null,
      jersey_number: jerseyNumber,
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

export async function applyStockOut(
  db: ClothingDb,
  input: {
    lotId: string;
    quantity: number;
    kind: "delivery" | "write_off";
    recipient_name?: string | null;
    notes?: string | null;
    created_by?: string | null;
    player_id?: string | null;
  },
): Promise<string> {
  const { data, error } = await db.rpc("apply_clothing_stock_out", {
    p_lot_id: input.lotId,
    p_kind: input.kind,
    p_quantity: input.quantity,
    p_recipient_name: input.recipient_name ?? null,
    p_notes: input.notes ?? null,
    p_created_by: input.created_by ?? null,
    p_player_id: input.player_id ?? null,
  });

  if (error) {
    const message = dbErrorMessage(error);
    if (/could not find the function|schema cache|does not exist/i.test(message)) {
      throw new Error(
        "Falta aplicar la migración de entregas (20260907130000_clothing_delivery_player_dorsal.sql) en Supabase.",
      );
    }
    throw new Error(message);
  }
  return String(data);
}

export async function assignJerseyNumbers(
  db: ClothingDb,
  lotId: string,
  jerseyNumbers: number[],
): Promise<string[]> {
  const { data, error } = await db.rpc("assign_clothing_jersey_numbers", {
    p_lot_id: lotId,
    p_jersey_numbers: jerseyNumbers,
  });

  if (error) {
    const message = dbErrorMessage(error);
    if (/could not find the function|schema cache|does not exist/i.test(message)) {
      throw new Error(
        "Falta aplicar la migración de entregas (20260907130000_clothing_delivery_player_dorsal.sql) en Supabase.",
      );
    }
    throw new Error(message);
  }

  return Array.isArray(data) ? data.map(String) : [];
}

export async function listLotsForSku(
  db: ClothingDb,
  productId: string,
  size: ClothingSize,
  storageLocationId: string | null,
  jerseyNumber: number | null = null,
): Promise<ClothingInventoryLot[]> {
  let query = db
    .from("clothing_inventory_lots")
    .select("*")
    .eq("product_id", productId)
    .eq("size", size)
    .order("created_at", { ascending: true });

  query =
    storageLocationId === null
      ? query.is("storage_location_id", null)
      : query.eq("storage_location_id", storageLocationId);

  query =
    jerseyNumber == null ? query.is("jersey_number", null) : query.eq("jersey_number", jerseyNumber);

  const { data, error } = await query;
  if (error) throw new Error(dbErrorMessage(error));
  return (data ?? []).map(mapLot);
}

export async function applyStockOutLines(
  db: ClothingDb,
  input: {
    kind: "delivery" | "write_off";
    recipient_name?: string | null;
    notes?: string | null;
    created_by?: string | null;
    player_id?: string | null;
    lines: {
      productId: string;
      size: ClothingSize;
      storageLocationId: string | null;
      quantity: number;
      jerseyNumber?: number | null;
    }[];
  },
): Promise<void> {
  const demand = new Map<string, { line: (typeof input.lines)[number]; quantity: number }>();
  for (const line of input.lines) {
    const jerseyNumber = line.jerseyNumber ?? null;
    const key = `${line.productId}::${line.size}::${line.storageLocationId ?? "pending"}::${jerseyNumber ?? "none"}`;
    const existing = demand.get(key);
    if (existing) existing.quantity += line.quantity;
    else demand.set(key, { line: { ...line, jerseyNumber }, quantity: line.quantity });
  }

  for (const { line, quantity } of demand.values()) {
    const lots = await listLotsForSku(
      db,
      line.productId,
      line.size,
      line.storageLocationId,
      line.jerseyNumber ?? null,
    );
    const available = lots.reduce((sum, lot) => sum + lot.quantity, 0);
    if (quantity > available) {
      throw new Error("No hay tantas unidades en esa ubicación");
    }
  }

  for (const line of input.lines) {
    const jerseyNumber = line.jerseyNumber ?? null;
    const lots = await listLotsForSku(
      db,
      line.productId,
      line.size,
      line.storageLocationId,
      jerseyNumber,
    );
    let remaining = line.quantity;
    for (const lot of lots) {
      if (remaining <= 0) break;
      const current = await getLotById(db, lot.id);
      if (!current || current.quantity <= 0) continue;
      const take = Math.min(current.quantity, remaining);
      await applyStockOut(db, {
        lotId: current.id,
        quantity: take,
        kind: input.kind,
        recipient_name: input.recipient_name,
        notes: input.notes,
        created_by: input.created_by,
        player_id: input.player_id,
      });
      remaining -= take;
    }
    if (remaining > 0) {
      throw new Error("No hay tantas unidades en esa ubicación");
    }
  }
}

export async function productUsedInStockMovements(
  db: ClothingDb,
  productId: string,
): Promise<boolean> {
  const { count, error } = await db
    .from("clothing_stock_movements")
    .select("*", { count: "exact", head: true })
    .eq("product_id", productId);

  if (error) throw new Error(dbErrorMessage(error));
  return (count ?? 0) > 0;
}
