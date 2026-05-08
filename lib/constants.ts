/**
 * Club palette — off-black / deep red / off-white (no pure #000, #FFF, #F00).
 * Mirrors CSS tokens in `app/globals.css` (`:root` / `html.dark`) for TS (charts, labels).
 */
export const clubPaletteDark = {
  bg: "#0F0F12",
  surface: "#18181B",
  surface2: "#27272A",
  border: "#3F3F46",
  brand: "#C8102E",
  brandStrong: "#9F0C24",
  brandSoft: "#F2D7DC",
  fg: "#FAFAF9",
  fgMuted: "#A1A1AA",
} as const;

export const clubPaletteLight = {
  bg: "#FAFAF9",
  surface: "#FFFFFE",
  surface2: "#F4F4F5",
  border: "#E4E4E7",
  brand: "#C8102E",
  brandStrong: "#9F0C24",
  brandSoft: "#F2D7DC",
  fg: "#1A1A1F",
  fgMuted: "#52525B",
} as const;

/** Alias: dark tokens (legacy name). */
export const clubPalette = clubPaletteDark;

export const appRoutes = {
  home: "/",
  login: "/login",
  parents: "/parents",
  admin: "/admin",
  adminPayments: "/admin/pagos",
  adminPaymentsHibrido: "/admin/pagos/hibrido",
  adminPaymentsConfig: "/admin/pagos/configuracion",
  adminPaymentsGenerate: "/admin/pagos/generacion",
  adminPaymentsPlanning: "/admin/pagos/planificacion",
  profile: "/perfil",
} as const;

export const userRoles = ["parent", "admin"] as const;
export type UserRole = (typeof userRoles)[number];
