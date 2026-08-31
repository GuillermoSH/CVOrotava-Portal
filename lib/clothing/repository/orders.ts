import { ORDER_TRANSITIONS } from "@/lib/clothing/constants";
import type { ClothingDb } from "@/lib/clothing/repository/client";
import { dbErrorMessage } from "@/lib/clothing/repository/helpers";
import { createInventoryLotsFromOrder } from "@/lib/clothing/repository/inventory";
import { mapOrder, mapOrderLine } from "@/lib/clothing/repository/mappers";
import type {
  ClothingOrderStatus,
  ClothingOrderWithLines,
  ClothingSize,
  ClothingSupplierOrder,
  ClothingSupplierOrderLine,
} from "@/lib/types/db";

export async function listOrdersWithLines(db: ClothingDb): Promise<{
  orders: ClothingSupplierOrder[];
  lines: ClothingSupplierOrderLine[];
}> {
  const [ordersRes, linesRes] = await Promise.all([
    db.from("clothing_supplier_orders").select("*").order("updated_at", { ascending: false }),
    db.from("clothing_supplier_order_lines").select("*"),
  ]);

  if (ordersRes.error) throw new Error(dbErrorMessage(ordersRes.error));
  if (linesRes.error) throw new Error(dbErrorMessage(linesRes.error));

  return {
    orders: (ordersRes.data ?? []).map(mapOrder),
    lines: (linesRes.data ?? []).map(mapOrderLine),
  };
}

export async function getOrderWithLines(
  db: ClothingDb,
  orderId: string,
): Promise<{ order: ClothingSupplierOrder; lines: ClothingSupplierOrderLine[] } | null> {
  const { data: orderRow, error: orderError } = await db
    .from("clothing_supplier_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) throw new Error(dbErrorMessage(orderError));
  if (!orderRow) return null;

  const { data: lineRows, error: lineError } = await db
    .from("clothing_supplier_order_lines")
    .select("*")
    .eq("order_id", orderId);

  if (lineError) throw new Error(dbErrorMessage(lineError));

  return {
    order: mapOrder(orderRow),
    lines: (lineRows ?? []).map(mapOrderLine),
  };
}

export async function nextOrderReference(db: ClothingDb, season: string): Promise<string> {
  const year = season.split("-")[0] ?? new Date().getFullYear().toString();
  const prefix = `PED-${year}-`;

  const { data, error } = await db
    .from("clothing_supplier_orders")
    .select("reference")
    .like("reference", `${prefix}%`);

  if (error) throw new Error(dbErrorMessage(error));

  const max = (data ?? []).reduce((acc, row) => {
    const suffix = String(row.reference).slice(prefix.length);
    const n = Number.parseInt(suffix, 10);
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);

  return `${prefix}${String(max + 1).padStart(2, "0")}`;
}

export async function createSupplierOrder(
  db: ClothingDb,
  input: {
    reference?: string;
    supplier_name: string;
    season: string;
    notes?: string | null;
    lines: { product_id: string; size: ClothingSize; quantity_ordered: number }[];
  },
): Promise<{ order: ClothingSupplierOrder; lines: ClothingSupplierOrderLine[] }> {
  const reference = input.reference ?? (await nextOrderReference(db, input.season));

  const { data: orderRow, error: orderError } = await db
    .from("clothing_supplier_orders")
    .insert({
      reference,
      supplier_name: input.supplier_name.trim(),
      season: input.season.trim(),
      notes: input.notes ?? null,
      status: "draft",
    })
    .select("*")
    .single();

  if (orderError) throw new Error(dbErrorMessage(orderError));

  const lineInserts = input.lines.map((line) => ({
    order_id: orderRow.id,
    product_id: line.product_id,
    size: line.size,
    quantity_ordered: line.quantity_ordered,
    quantity_received: 0,
  }));

  const { data: lineRows, error: lineError } = await db
    .from("clothing_supplier_order_lines")
    .insert(lineInserts)
    .select("*");

  if (lineError) throw new Error(dbErrorMessage(lineError));

  return {
    order: mapOrder(orderRow),
    lines: (lineRows ?? []).map(mapOrderLine),
  };
}

export async function updateOrderStatus(
  db: ClothingDb,
  orderId: string,
  status: ClothingOrderStatus,
): Promise<ClothingSupplierOrder> {
  const existing = await getOrderWithLines(db, orderId);
  if (!existing) throw new Error("Pedido no encontrado");

  const allowed = ORDER_TRANSITIONS[existing.order.status];
  if (!allowed.includes(status)) {
    throw new Error("Transición de estado no permitida");
  }

  const { data, error } = await db
    .from("clothing_supplier_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .select("*")
    .single();

  if (error) throw new Error(dbErrorMessage(error));

  if (status === "returned_from_serigraphy") {
    await createInventoryLotsFromOrder(db, orderId);
  }

  return mapOrder(data);
}

export async function updateOrderLineReceived(
  db: ClothingDb,
  lineId: string,
  quantityReceived: number,
): Promise<ClothingSupplierOrderLine> {
  const { data: lineRow, error: fetchError } = await db
    .from("clothing_supplier_order_lines")
    .select("*")
    .eq("id", lineId)
    .maybeSingle();

  if (fetchError) throw new Error(dbErrorMessage(fetchError));
  if (!lineRow) throw new Error("Línea no encontrada");

  const { data, error } = await db
    .from("clothing_supplier_order_lines")
    .update({ quantity_received: quantityReceived })
    .eq("id", lineId)
    .select("*")
    .single();

  if (error) throw new Error(dbErrorMessage(error));

  await db
    .from("clothing_supplier_orders")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", lineRow.order_id);

  return mapOrderLine(data);
}

export async function deleteOrdersByIds(db: ClothingDb, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await db.from("clothing_supplier_orders").delete().in("id", ids);
  if (error) throw new Error(dbErrorMessage(error));
}
