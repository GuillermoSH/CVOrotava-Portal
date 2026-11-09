"use server";

import { invalidatePayments } from "@/lib/cache/invalidate";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { getPaymentsDb } from "@/lib/payments/repository/client";
import { getCachedSeasonFeeLines } from "@/lib/payments/cached-fees";
import { obligationConcept } from "@/lib/payments/fees";
import {
  deletePayment,
  updatePaymentFee,
  updatePaymentMethod,
} from "@/lib/payments/repository/payments";
import {
  assignPaymentFeeSchema,
  deletePaymentSchema,
  updatePaymentMethodSchema,
} from "@/lib/payments/schemas";
import { getCurrentSeason } from "@/lib/season";

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
    invalidatePayments();
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
    invalidatePayments();
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

/** Asigna un cobro a una línea de tarifa concreta (concepto y mes), p. ej. un cobro libre sin concepto. */
export async function assignPaymentFeeAction(input: unknown): Promise<CorrectActionResult> {
  try {
    await requirePaymentsWriteAccess();
    const parsed = assignPaymentFeeSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const lines = await getCachedSeasonFeeLines(getCurrentSeason());
    const line = lines.find((l) => l.code === parsed.data.fee_code);
    if (!line) return { ok: false, error: "Esa línea de tarifa no existe esta temporada" };

    const month = line.kind === "monthly" ? (parsed.data.billing_month ?? null) : null;
    if (line.kind === "monthly" && (month == null || !line.months.includes(month))) {
      return { ok: false, error: "Mes no válido para esta mensualidad" };
    }

    await updatePaymentFee(await getPaymentsDb(), parsed.data.id, {
      fee_code: line.code,
      billing_month: month,
      concept: obligationConcept({ label: line.label, month }),
    });
    invalidatePayments();
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}
