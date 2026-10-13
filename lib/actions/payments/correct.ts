"use server";

import { revalidatePath } from "next/cache";

import { appRoutes } from "@/lib/constants";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { getPaymentsDb } from "@/lib/payments/repository/client";
import { deletePayment, updatePaymentMethod } from "@/lib/payments/repository/payments";
import { deletePaymentSchema, updatePaymentMethodSchema } from "@/lib/payments/schemas";

export type CorrectActionResult = { ok: true } | { ok: false; error: string };

function failure(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
}

/** Corrige T ↔ E de un cobro ya anotado. */
export async function updatePaymentMethodAction(input: unknown): Promise<CorrectActionResult> {
  try {
    await requirePaymentsWriteAccess();
    const parsed = updatePaymentMethodSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    await updatePaymentMethod(await getPaymentsDb(), parsed.data.id, parsed.data.method);
    revalidatePath(appRoutes.payments.list, "layout");
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

/** Anula un cobro anotado por error. */
export async function deletePaymentAction(input: unknown): Promise<CorrectActionResult> {
  try {
    await requirePaymentsWriteAccess();
    const parsed = deletePaymentSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    await deletePayment(await getPaymentsDb(), parsed.data.id);
    revalidatePath(appRoutes.payments.list, "layout");
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}
