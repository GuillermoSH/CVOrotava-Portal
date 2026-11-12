"use server";

import { revalidatePath } from "next/cache";

import {
  invalidateClothingInventory,
  invalidateClothingOrders,
} from "@/lib/cache/invalidate";
import { requireClothingWriteAccess } from "@/lib/clothing/auth";
import { validatePlannedRows } from "@/lib/clothing/plannedDeliveries";
import { getClothingDb } from "@/lib/clothing/repository/client";
import {
  listPlannedByOrder,
  replacePendingPlanned,
} from "@/lib/clothing/repository/plannedDeliveries";
import {
  createSupplierOrder as createSupplierOrderRepo,
  getOrderWithLines,
  deleteDraftOrder as deleteDraftOrderRepo,
  deleteOrder as deleteOrderRepo,
  updateDraftOrder as updateDraftOrderRepo,
  updateOrderLineReceived as updateOrderLineReceivedRepo,
  updateOrderStatus as updateOrderStatusRepo,
} from "@/lib/clothing/repository/orders";
import {
  createOrderSchema,
  deleteDraftOrderSchema,
  setOrderPlannedSchema,
  updateDraftOrderSchema,
  updateOrderLineReceivedSchema,
  updateOrderStatusSchema,
} from "@/lib/clothing/schemas";
import { appRoutes } from "@/lib/constants";

export type ActionResult =
  | { ok: true; orderId?: string }
  | { ok: false; error: string };

function revalidateOrders(extraPath?: string) {
  invalidateClothingOrders();
  if (extraPath) revalidatePath(extraPath);
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

    const { reference, supplier_name, season, notes, lines, planned } = parsed.data;
    const plannedProblem = validatePlannedRows(planned, lines);
    if (plannedProblem) return { ok: false, error: plannedProblem };

    const db = await getClothingDb();
    const { data: authData } = await db.auth.getUser();
    const { order } = await createSupplierOrderRepo(db, {
      reference,
      supplier_name,
      season,
      notes,
      lines,
      changed_by: authData.user?.id ?? null,
    });
    if (planned.length > 0) {
      await replacePendingPlanned(db, order.id, planned, authData.user?.id ?? null);
    }

    revalidateOrders(`/admin/ropa/pedidos/${order.id}`);
    return { ok: true, orderId: order.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

/** @deprecated Alias for createSupplierOrderAction */
export const createSupplierOrder = createSupplierOrderAction;

export async function updateDraftOrderAction(input: unknown): Promise<ActionResult> {
  try {
    await requireClothingWriteAccess();
    const parsed = updateDraftOrderSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const { order_id, supplier_name, season, notes, lines, planned } = parsed.data;
    const plannedProblem = validatePlannedRows(planned, lines);
    if (plannedProblem) return { ok: false, error: plannedProblem };

    const db = await getClothingDb();
    const { data: authData } = await db.auth.getUser();
    await updateDraftOrderRepo(db, {
      order_id,
      supplier_name,
      season,
      notes,
      lines,
    });
    await replacePendingPlanned(db, order_id, planned, authData.user?.id ?? null);

    revalidateOrders(`/admin/ropa/pedidos/${order_id}`);
    return { ok: true, orderId: order_id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

export async function deleteDraftOrderAction(input: unknown): Promise<ActionResult> {
  try {
    await requireClothingWriteAccess();
    const parsed = deleteDraftOrderSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getClothingDb();
    await deleteDraftOrderRepo(db, parsed.data.order_id);

    revalidateOrders(appRoutes.clothing.orders);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

/** Elimina un pedido en cualquier estado (si ya hay stock, solo mientras esté intacto). */
export async function deleteOrderAction(input: unknown): Promise<ActionResult> {
  try {
    await requireClothingWriteAccess();
    const parsed = deleteDraftOrderSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getClothingDb();
    await deleteOrderRepo(db, parsed.data.order_id);

    revalidateOrders(appRoutes.clothing.orders);
    invalidateClothingInventory();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

export async function updateOrderStatus(input: unknown): Promise<ActionResult> {
  try {
    await requireClothingWriteAccess();
    const parsed = updateOrderStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getClothingDb();
    const { data: authData } = await db.auth.getUser();
    const { order_id, status } = parsed.data;
    await updateOrderStatusRepo(db, order_id, status, authData.user?.id ?? null);

    invalidateClothingOrders();
    invalidateClothingInventory();
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

    invalidateClothingOrders();
    invalidateClothingInventory();
    revalidatePath(`/admin/ropa/pedidos/${line.order_id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

/**
 * Cambia las entregas previstas de un pedido ya enviado o recibido (en borrador van con el
 * formulario del pedido). Lo ya entregado no se toca y cuenta para el tope de lo pedido.
 */
export async function setOrderPlannedDeliveriesAction(input: unknown): Promise<ActionResult> {
  try {
    await requireClothingWriteAccess();
    const parsed = setOrderPlannedSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getClothingDb();
    const { order_id, planned } = parsed.data;
    const existing = await getOrderWithLines(db, order_id);
    if (!existing) return { ok: false, error: "Pedido no encontrado" };
    if (existing.order.status === "closed") {
      return { ok: false, error: "El pedido está cerrado" };
    }

    const current = await listPlannedByOrder(db, order_id);
    const delivered = current.filter((row) => row.delivered_at !== null);
    const problem = validatePlannedRows(planned, existing.lines, delivered);
    if (problem) return { ok: false, error: problem };

    const { data: authData } = await db.auth.getUser();
    await replacePendingPlanned(db, order_id, planned, authData.user?.id ?? null);

    revalidateOrders(`/admin/ropa/pedidos/${order_id}`);
    invalidateClothingInventory();
    return { ok: true, orderId: order_id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}
