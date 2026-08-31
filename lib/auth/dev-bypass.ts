import "server-only";

import type { UserRole } from "@/lib/constants";
import { isUserRole } from "@/lib/auth/roles";

/**
 * Bypass de login solo en desarrollo local. Activar con DEV_AUTH_BYPASS=true en .env.local.
 * Nunca usar en producción.
 */
export function isDevAuthBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_AUTH_BYPASS === "true"
  );
}

export function getDevBypassRole(): UserRole {
  const configured = process.env.DEV_AUTH_BYPASS_ROLE;
  if (configured && isUserRole(configured)) {
    return configured;
  }
  return "admin";
}
