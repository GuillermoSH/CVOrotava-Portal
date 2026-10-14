"use server";

import { invalidatePaymentFees } from "@/lib/cache/invalidate";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { getPaymentsDb } from "@/lib/payments/repository/client";
import {
  copySeasonFeeLines,
  deleteFeeLine,
  upsertFeeLine,
} from "@/lib/payments/repository/fees";
import { copySeasonFeesSchema, upsertFeeLineSchema } from "@/lib/payments/schemas";

export type FeeActionResult = { ok: true; id?: string } | { ok: false; error: string };
export type CopyFeesResult = { ok: true; copied: number } | { ok: false; error: string };

function failure(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
}

export async function saveFeeLineAction(input: unknown): Promise<FeeActionResult> {
  try {
    await requirePaymentsWriteAccess();
    const parsed = upsertFeeLineSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getPaymentsDb();
    const line = await upsertFeeLine(db, parsed.data);

    invalidatePaymentFees();
    return { ok: true, id: line.id };
  } catch (e) {
    return failure(e);
  }
}

export async function deleteFeeLineAction(id: string): Promise<FeeActionResult> {
  try {
    await requirePaymentsWriteAccess();
    if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Línea no válida" };

    const db = await getPaymentsDb();
    await deleteFeeLine(db, id);

    invalidatePaymentFees();
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

/** Copia la tarifa de otra temporada cuando la elegida está vacía. */
export async function copySeasonFeesAction(input: unknown): Promise<CopyFeesResult> {
  try {
    await requirePaymentsWriteAccess();
    const parsed = copySeasonFeesSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    if (parsed.data.from_season === parsed.data.to_season) {
      return { ok: false, error: "Elige otra temporada de origen" };
    }

    const db = await getPaymentsDb();
    const copied = await copySeasonFeeLines(db, parsed.data.from_season, parsed.data.to_season);

    invalidatePaymentFees();
    return { ok: true, copied };
  } catch (e) {
    return failure(e);
  }
}
