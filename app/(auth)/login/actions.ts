"use server";

import { redirect } from "next/navigation";

import { isUserRole } from "@/lib/auth/roles";
import { roleHomeRoute } from "@/lib/auth/portal-access";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=credenciales");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    redirect("/login?error=credenciales");
  }

  const admin = createServiceRoleClient();
  const { data: roleRows, error: rolesError } = await admin
    .from("user_app_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("app", "portal");

  const role = !rolesError
    ? roleRows?.map((row) => row.role).find(isUserRole)
    : undefined;

  if (!role) {
    try {
      await admin.auth.admin.signOut(data.user.id, "global");
    } catch (err) {
      console.error("Failed to globally revoke session for denied user:", err);
    }
    await supabase.auth.signOut();
    redirect("/login?error=sin-acceso-portal");
  }

  redirect(roleHomeRoute(role));
}
