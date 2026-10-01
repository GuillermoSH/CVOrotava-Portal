import "server-only";

import { dbErrorMessage } from "@/lib/clothing/repository/helpers";
import { mapPayment, type PaymentRow } from "@/lib/payments/mappers";
import type { PaymentsDb } from "@/lib/payments/repository/client";
import { getCurrentSeason, type SeasonId } from "@/lib/season";
import type { Payment } from "@/lib/types/db";

const PAYMENT_SELECT =
  "id, user_id, player_id, concept, amount, status, due_date, paid_date, notes, created_at, updated_at, season, method";

/** player_ids con Matrícula ya pagada esta temporada — base del badge Pagada/Pendiente.
 *  "Matrícula" se determina por payment_concepts.is_matricula (no por texto fijo), para
 *  que renombrar el concepto desde la mini-UI de gestión no rompa esta comprobación. */
export async function listPlayerIdsWithPaidMatricula(
  db: PaymentsDb,
  season: SeasonId = getCurrentSeason(),
): Promise<Set<string>> {
  const { data: concepts, error: conceptsError } = await db
    .from("payment_concepts")
    .select("concept")
    .eq("is_matricula", true);
  if (conceptsError) throw new Error(dbErrorMessage(conceptsError));

  const matriculaConcepts = [...new Set((concepts ?? []).map((row) => row.concept as string))];
  if (matriculaConcepts.length === 0) return new Set();

  const { data, error } = await db
    .from("payments")
    .select("player_id")
    .eq("season", season)
    .in("concept", matriculaConcepts)
    .eq("status", "paid")
    .not("player_id", "is", null);

  if (error) throw new Error(dbErrorMessage(error));
  return new Set((data ?? []).map((row) => row.player_id as string));
}

/** Histórico de pagos de un jugador para una temporada. */
export async function listPlayerPayments(
  db: PaymentsDb,
  playerId: string,
  season: SeasonId = getCurrentSeason(),
): Promise<Payment[]> {
  const { data, error } = await db
    .from("payments")
    .select(PAYMENT_SELECT)
    .eq("player_id", playerId)
    .eq("season", season)
    .order("paid_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(dbErrorMessage(error));
  return (data ?? []).map((row) => mapPayment(row as PaymentRow));
}

export type CreatePaymentInput = {
  player_id: string;
  user_id: string | null;
  concept: string;
  amount: number;
  paid_date: string;
  method: string;
  notes?: string | null;
  season?: SeasonId;
};

function buildPaymentRow(input: CreatePaymentInput) {
  return {
    player_id: input.player_id,
    user_id: input.user_id,
    concept: input.concept,
    amount: input.amount,
    status: "paid" as const,
    paid_date: input.paid_date,
    due_date: null,
    method: input.method,
    notes: input.notes?.trim() || null,
    season: input.season ?? getCurrentSeason(),
  };
}

/** Crea un pago ya cobrado: status="paid" fijo (ver AGENTS.md — sin pasarela de pago). */
export async function createPayment(db: PaymentsDb, input: CreatePaymentInput): Promise<Payment> {
  const { data, error } = await db
    .from("payments")
    .insert(buildPaymentRow(input))
    .select(PAYMENT_SELECT)
    .single();

  if (error) throw new Error(dbErrorMessage(error));
  return mapPayment(data as PaymentRow);
}

/** Crea un pago idéntico (mismo concepto/importe/fecha/método) para varios jugadores a la vez. */
export async function createPayments(
  db: PaymentsDb,
  inputs: CreatePaymentInput[],
): Promise<Payment[]> {
  if (inputs.length === 0) return [];
  const { data, error } = await db
    .from("payments")
    .insert(inputs.map(buildPaymentRow))
    .select(PAYMENT_SELECT);

  if (error) throw new Error(dbErrorMessage(error));
  return (data ?? []).map((row) => mapPayment(row as PaymentRow));
}
