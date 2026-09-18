"use server";

import { redirect } from "next/navigation";

import { appRoutes } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(appRoutes.login);
}
