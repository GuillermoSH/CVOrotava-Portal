/**
 * Club palette — portada de CVOrotava-Team-Manager (glass oscuro + rojo acento).
 * Mirrors CSS tokens in `app/globals.css` (`:root` / `html.dark`) for TS (charts, labels).
 */
export const clubPaletteDark = {
  bg: "#0D0D0F",
  surface: "rgba(255, 255, 255, 0.04)",
  surface2: "#1C1C1A",
  border: "rgba(255, 255, 255, 0.08)",
  brand: "#E62222",
  brandStrong: "#C41919",
  brandSoft: "rgba(230, 34, 34, 0.15)",
  fg: "#F0F0F5",
  fgMuted: "#A0A0B0",
} as const;

export const clubPaletteLight = {
  bg: "#F0F0F4",
  surface: "rgba(255, 255, 255, 0.78)",
  surface2: "#E8E8EC",
  border: "rgba(0, 0, 0, 0.09)",
  brand: "#D01E1E",
  brandStrong: "#B91C1C",
  brandSoft: "rgba(208, 30, 30, 0.12)",
  fg: "#12121A",
  fgMuted: "#3F3F50",
} as const;

/** Alias: dark tokens (legacy name). */
export const clubPalette = clubPaletteDark;

export const appRoutes = {
  home: "/",
  login: "/login",
  /** OAuth Google (PKCE). Misma ruta que Team Manager. */
  authCallback: "/api/auth/callback",
  parents: "/parents",
  admin: "/admin",
  profile: "/perfil",
  clothing: {
    hub: "/admin/ropa",
    orders: "/admin/ropa/pedidos",
    newOrder: "/admin/ropa/pedidos/nuevo",
    orderDetail: (id: string) => `/admin/ropa/pedidos/${id}`,
    products: "/admin/ropa/prendas",
    warehouse: "/admin/ropa/almacen",
    locations: "/admin/ropa/almacen/ubicaciones",
  },
} as const;

/** Roles de Portal — deben coincidir con el CHECK de user_app_roles.role. */
export const userRoles = ["admin", "manager", "coach", "parent"] as const;
export type UserRole = (typeof userRoles)[number];
