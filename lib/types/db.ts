/**
 * Placeholder domain types until Supabase migrations + generated types exist.
 * Do not store real member data in mocks committed to the repo.
 */

export type PaymentMethod = "transfer" | "cash";

export type Profile = {
  id: string;
  role: "parent" | "admin";
  display_name: string | null;
};

export type Payment = {
  id: string;
  parent_id: string;
  concept: string;
  amount_cents: number;
  method: PaymentMethod;
  paid_at: string | null;
  notes: string | null;
};

export type ClothingItem = {
  id: string;
  name: string;
  size: string;
  stock: number;
  price_cents: number;
  image_url: string | null;
};

export type ClothingReservation = {
  id: string;
  parent_id: string;
  item_id: string;
  size: string;
  quantity: number;
  status: "pending" | "confirmed" | "cancelled";
};
