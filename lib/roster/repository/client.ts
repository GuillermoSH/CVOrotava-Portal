import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type RosterDb = SupabaseClient;

export async function getRosterDb(): Promise<RosterDb> {
  return createClient();
}
