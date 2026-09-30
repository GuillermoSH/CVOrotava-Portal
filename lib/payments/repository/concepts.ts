import "server-only";

import { dbErrorMessage } from "@/lib/clothing/repository/helpers";
import type { PaymentsDb } from "@/lib/payments/repository/client";
import type { PaymentConcept } from "@/lib/types/db";

const CONCEPT_SELECT =
  "id, concept, amount, is_matricula, is_active, sort_order, created_at, updated_at";

type PaymentConceptRow = {
  id: string;
  concept: string;
  amount: number | string;
  is_matricula: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function mapPaymentConcept(row: PaymentConceptRow): PaymentConcept {
  return {
    id: row.id,
    concept: row.concept,
    amount: typeof row.amount === "string" ? Number(row.amount) : row.amount,
    is_matricula: row.is_matricula,
    is_active: row.is_active,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Catálogo de conceptos predefinidos, ordenado para el desplegable del formulario. */
export async function listPaymentConcepts(
  db: PaymentsDb,
  { activeOnly = true }: { activeOnly?: boolean } = {},
): Promise<PaymentConcept[]> {
  let query = db.from("payment_concepts").select(CONCEPT_SELECT).order("sort_order");
  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw new Error(dbErrorMessage(error));
  return (data ?? []).map((row) => mapPaymentConcept(row as PaymentConceptRow));
}

export async function getPaymentConceptById(
  db: PaymentsDb,
  id: string,
): Promise<PaymentConcept | null> {
  const { data, error } = await db
    .from("payment_concepts")
    .select(CONCEPT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(dbErrorMessage(error));
  if (!data) return null;
  return mapPaymentConcept(data as PaymentConceptRow);
}

export type CreatePaymentConceptInput = {
  concept: string;
  amount: number;
  is_matricula: boolean;
  sort_order: number;
};

export async function createPaymentConcept(
  db: PaymentsDb,
  input: CreatePaymentConceptInput,
): Promise<PaymentConcept> {
  const { data, error } = await db
    .from("payment_concepts")
    .insert(input)
    .select(CONCEPT_SELECT)
    .single();

  if (error) throw new Error(dbErrorMessage(error));
  return mapPaymentConcept(data as PaymentConceptRow);
}

export type UpdatePaymentConceptInput = {
  id: string;
  concept: string;
  amount: number;
  is_matricula: boolean;
  is_active: boolean;
};

export async function updatePaymentConcept(
  db: PaymentsDb,
  input: UpdatePaymentConceptInput,
): Promise<PaymentConcept> {
  const { id, ...rest } = input;
  const { data, error } = await db
    .from("payment_concepts")
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(CONCEPT_SELECT)
    .single();

  if (error) throw new Error(dbErrorMessage(error));
  return mapPaymentConcept(data as PaymentConceptRow);
}

/** Máximo sort_order actual — para que un concepto nuevo aparezca al final. */
export async function nextPaymentConceptSortOrder(db: PaymentsDb): Promise<number> {
  const { data, error } = await db
    .from("payment_concepts")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(dbErrorMessage(error));
  return (data?.sort_order ?? 0) + 1;
}
