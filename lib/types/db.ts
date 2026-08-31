/**
 * Placeholder domain types until Supabase migrations + generated types exist.
 * Do not store real member data in mocks committed to the repo.
 */

import type { UserRole } from "@/lib/constants";

export type PaymentMethod = "transfer" | "cash";

export type Profile = {
  id: string;
  role: UserRole;
  display_name: string | null;
};

/** supabase/migrations/20260831120000_portal_access_and_roster.sql */
export type Team = {
  id: string;
  name: string;
  category: string;
  gender: "male" | "female";
  season: string;
};

export type Player = {
  id: string;
  full_name: string;
  birth_date: string | null;
  team_id: string | null;
  /** Set when the player has their own login (senior players). */
  user_id: string | null;
  season: string;
  is_active: boolean;
};

export type PlayerGuardian = {
  id: string;
  player_id: string;
  guardian_user_id: string;
  relationship: string | null;
};

export type UserAppRole = {
  id: string;
  user_id: string;
  app: "team_manager" | "portal";
  role: UserRole;
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
