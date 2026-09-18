import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type ClothingDb = SupabaseClient;

export async function getClothingDb(): Promise<ClothingDb> {
  return createClient();
}
