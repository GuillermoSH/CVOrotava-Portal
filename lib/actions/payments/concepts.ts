"use server";

import { revalidatePath } from "next/cache";

import { appRoutes } from "@/lib/constants";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { getPaymentsDb } from "@/lib/payments/repository/client";
import {
  createPaymentConcept,
  getPaymentConceptById,
  nextPaymentConceptSortOrder,
  updatePaymentConcept,
} from "@/lib/payments/repository/concepts";
import {
  createPaymentConceptSchema,
  updatePaymentConceptSchema,
} from "@/lib/payments/schemas";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function revalidatePaymentConcepts() {
  revalidatePath(appRoutes.payments.concepts, "layout");
  revalidatePath(appRoutes.payments.list, "layout");
}

export async function createPaymentConceptAction(input: unknown): Promise<ActionResult> {
  try {
    await requirePaymentsWriteAccess();
    const parsed = createPaymentConceptSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getPaymentsDb();
    const sortOrder = await nextPaymentConceptSortOrder(db);
    const concept = await createPaymentConcept(db, { ...parsed.data, sort_order: sortOrder });

    revalidatePaymentConcepts();
    return { ok: true, id: concept.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

export async function updatePaymentConceptAction(input: unknown): Promise<ActionResult> {
  try {
    await requirePaymentsWriteAccess();
    const parsed = updatePaymentConceptSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getPaymentsDb();
    const existing = await getPaymentConceptById(db, parsed.data.id);
    if (!existing) return { ok: false, error: "Concepto no encontrado" };

    await updatePaymentConcept(db, parsed.data);
    revalidatePaymentConcepts();
    return { ok: true, id: parsed.data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}

export async function setPaymentConceptActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  try {
    await requirePaymentsWriteAccess();
    const db = await getPaymentsDb();
    const existing = await getPaymentConceptById(db, id);
    if (!existing) return { ok: false, error: "Concepto no encontrado" };

    await updatePaymentConcept(db, {
      id,
      concept: existing.concept,
      amount: existing.amount,
      is_matricula: existing.is_matricula,
      is_active: isActive,
    });

    revalidatePaymentConcepts();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }
}
