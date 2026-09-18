import "server-only";

import { redirect } from "next/navigation";

import { isUserRole } from "@/lib/auth/roles";
import { getDevBypassRole, isDevAuthBypassEnabled } from "@/lib/auth/dev-bypass";
import { appRoutes, type UserRole } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

/** Prioridad al resolver la ruta de inicio si un usuario tuviera más de un rol. */
const ROLE_PRIORITY: readonly UserRole[] = ["admin", "manager", "coach", "parent"];

/**
 * Exige sesión + rol de Portal (`user_app_roles` con app='portal') para
 * renderizar un layout protegido. Distingue el motivo de la denegación en
 * el redirect — sin esto, un rol ausente por RLS/datos incorrectos rebota
 * a /login en silencio y es indistinguible de "nunca hubo sesión".
 */
export async function requirePortalRole(): Promise<UserRole> {
  if (isDevAuthBypassEnabled()) {
    return getDevBypassRole();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(appRoutes.login);
  }

  const { data, error } = await supabase
    .from("user_app_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("app", "portal");

  if (error) {
    console.error("user_app_roles lookup failed:", error.message);
  }

  const roles = (data ?? []).map((row) => row.role).filter(isUserRole);
  const role = ROLE_PRIORITY.find((r) => roles.includes(r));

  if (!role) {
    redirect(`${appRoutes.login}?error=sin-acceso-portal`);
  }

  return role;
}

export function roleHomeRoute(role: UserRole): string {
  return role === "parent" ? appRoutes.parents : appRoutes.admin;
}
