"use server";

import { revalidatePath } from "next/cache";

import { requireClothingWriteAccess } from "@/lib/clothing/auth";
import { getClothingDb } from "@/lib/clothing/repository/client";
import {
  createSupplierOrder as createSupplierOrderRepo,
  updateOrderLineReceived as updateOrderLineReceivedRepo,
  updateOrderStatus as updateOrderStatusRepo,
} from "@/lib/clothing/repository/orders";
import {
  createOrderSchema,
  updateOrderLineReceivedSchema,
  updateOrderStatusSchema,
} from "@/lib/clothing/schemas";

export type ActionResult =
  | { ok: true; orderId?: string }
  | { ok: false; error: string };

const CLOTHING_PATHS = [
  "/admin/ropa",
  "/admin/ropa/pedidos",
  "/admin/ropa/almacen",
];

function revalidateClothing() {
  for (const path of CLOTHING_PATHS) {
    revalidatePath(path, "layout");
  }
}

export async function createSupplierOrderAction(
  input: unknown,
): Promise<ActionResult & { orderId?: string }> {
  try {
    await requireClothingWriteAccess();
    const parsed = createOrderSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getClothingDb();
    const { reference, supplier_name, season, notes, lines } = parsed.data;
    const { order } = await createSupplierOrderRepo(db, {
      reference,
      supplier_name,
      season,
      notes,
      lines,
    });

    revalidateClothing();
    revalidatePath(`/admin/ropa/pedidos/${order.id}`);
    return { ok: true, orderId: order.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

/** @deprecated Alias for createSupplierOrderAction */
export const createSupplierOrder = createSupplierOrderAction;

export async function updateOrderStatus(input: unknown): Promise<ActionResult> {
  try {
    await requireClothingWriteAccess();
    const parsed = updateOrderStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getClothingDb();
    const { order_id, status } = parsed.data;
    await updateOrderStatusRepo(db, order_id, status);

    revalidateClothing();
    revalidatePath(`/admin/ropa/pedidos/${order_id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

export async function updateOrderLineReceived(input: unknown): Promise<ActionResult> {
  try {
    await requireClothingWriteAccess();
    const parsed = updateOrderLineReceivedSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getClothingDb();
    const line = await updateOrderLineReceivedRepo(
      db,
      parsed.data.line_id,
      parsed.data.quantity_received,
    );

    revalidateClothing();
    revalidatePath(`/admin/ropa/pedidos/${line.order_id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}
