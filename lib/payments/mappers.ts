import type { Payment, PaymentMethod, PaymentStatus } from "@/lib/types/db";

export type PaymentRow = {
  id: string;
  user_id: string | null;
  player_id: string | null;
  concept: string;
  amount: number | string; // Postgres numeric puede volver como string
  status: string;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  season: string | null;
  method: string | null;
};

export function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    user_id: row.user_id,
    player_id: row.player_id,
    concept: row.concept,
    amount: typeof row.amount === "string" ? Number(row.amount) : row.amount,
    status: row.status as PaymentStatus,
    due_date: row.due_date,
    paid_date: row.paid_date,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    season: row.season,
    method: row.method as PaymentMethod | null,
  };
}
