import "server-only";

import { dbErrorMessage } from "@/lib/clothing/repository/helpers";
import { mapPayment, type PaymentRow } from "@/lib/payments/mappers";
import type { PaymentsDb } from "@/lib/payments/repository/client";
import { getCurrentSeason, type SeasonId } from "@/lib/season";
import type { Payment } from "@/lib/types/db";

const PAYMENT_SELECT =
  "id, user_id, player_id, concept, amount, status, due_date, paid_date, notes, created_at, updated_at, season, method, fee_code, billing_month";

/** player_ids con Matrícula ya pagada esta temporada — base del badge Pagada/Pendiente.
 *  Cuenta el cobro cerrado con fee_code "matricula" o, para anotaciones previas sin
 *  fee_code, el concepto escrito "Matrícula…" (el backfill de la migración ya lo asigna). */
export async function listPlayerIdsWithPaidMatricula(
  db: PaymentsDb,
  season: SeasonId = getCurrentSeason(),
): Promise<Set<string>> {
  const { data, error } = await db
    .from("payments")
    .select("player_id")
    .eq("season", season)
    .eq("status", "paid")
    .or("fee_code.eq.matricula,concept.ilike.matr_cula%")
    .not("player_id", "is", null);

  if (error) throw new Error(dbErrorMessage(error));
  return new Set((data ?? []).map((row) => row.player_id as string));
}

export type SeasonPaymentFacts = {
  player_id: string;
  amount: number;
  status: string;
  fee_code: string | null;
  billing_month: number | null;
};

const SEASON_PAYMENTS_PAGE = 1000;

/** Cobros de la temporada agrupados por jugador (solo lo que necesita el cálculo de tarifa). */
export async function listSeasonPaymentFacts(
  db: PaymentsDb,
  season: SeasonId,
): Promise<Map<string, SeasonPaymentFacts[]>> {
  const byPlayer = new Map<string, SeasonPaymentFacts[]>();

  for (let from = 0; ; from += SEASON_PAYMENTS_PAGE) {
    const { data, error } = await db
      .from("payments")
      .select("player_id, amount, status, fee_code, billing_month")
      .eq("season", season)
      .eq("status", "paid")
      .not("player_id", "is", null)
      .order("created_at")
      .range(from, from + SEASON_PAYMENTS_PAGE - 1);

    if (error) throw new Error(dbErrorMessage(error));
    const rows = data ?? [];

    for (const row of rows) {
      const playerId = row.player_id as string;
      const list = byPlayer.get(playerId) ?? [];
      list.push({
        player_id: playerId,
        amount: typeof row.amount === "string" ? Number(row.amount) : (row.amount as number),
        status: row.status as string,
        fee_code: (row.fee_code as string | null) ?? null,
        billing_month: (row.billing_month as number | null) ?? null,
      });
      byPlayer.set(playerId, list);
    }

    if (rows.length < SEASON_PAYMENTS_PAGE) break;
  }

  return byPlayer;
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
  /** Línea de tarifa que cierra el cobro; null = cobro libre. */
  fee_code?: string | null;
  billing_month?: number | null;
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
    fee_code: input.fee_code ?? null,
    billing_month: input.billing_month ?? null,
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
