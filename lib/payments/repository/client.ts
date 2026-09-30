import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type PaymentsDb = SupabaseClient;

export async function getPaymentsDb(): Promise<PaymentsDb> {
  return createClient();
}
