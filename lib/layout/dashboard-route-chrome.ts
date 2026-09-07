import { appRoutes } from "@/lib/constants";

/**
 * Cromado estático por ruta del dashboard.
 * Al añadir una página nueva: registra aquí título/atrás/tipo de skeleton
 * y envuelve solo los datos con `<DashboardPage>` si el título o las acciones
 * dependen de la carga.
 */
export type DashboardSkeletonKind =
  | "admin"
  | "hub"
  | "players"
  | "player-form"
  | "deliveries"
  | "products"
  | "warehouse"
  | "locations"
  | "orders"
  | "order-form"
  | "order-detail"
  | "parents"
  | "profile";

export type DashboardRouteChrome = {
  title: string;
  subtitle?: string;
  back?: { href: string; label: string };
  sticky?: boolean | "tall";
  skeleton: DashboardSkeletonKind;
  action?: { href: string; label: string };
};

export function getDashboardRouteChrome(pathname: string): DashboardRouteChrome | null {
  if (pathname === appRoutes.admin) {
    return {
      title: "Resumen del club",
      subtitle: "Vista general de pagos, morosidad e inventario de ropa. Datos ficticios hasta conectar Supabase.",
      skeleton: "admin",
    };
  }

  if (pathname === appRoutes.players.new) {
    return {
      title: "Nuevo jugador",
      subtitle:
        "Ficha de la temporada. El equipo es el principal; las convocatorias a otras categorías no se anotan aquí.",
      back: { href: appRoutes.players.list, label: "Jugadores" },
      sticky: true,
      skeleton: "player-form",
    };
  }

  if (pathname === appRoutes.players.list) {
    return {
      title: "Jugadores",
      subtitle: "Equipo principal, trámites y contacto familiar.",
      sticky: true,
      skeleton: "players",
      action: { href: appRoutes.players.new, label: "Nuevo jugador" },
    };
  }

  if (pathname.startsWith(`${appRoutes.players.list}/`)) {
    return {
      title: "Ficha del jugador",
      back: { href: appRoutes.players.list, label: "Jugadores" },
      sticky: true,
      skeleton: "player-form",
    };
  }

  if (pathname === appRoutes.clothing.hub) {
    return {
      title: "Gestión de ropa",
      subtitle: "Pedidos a proveedor, serigrafía e inventario en almacén. Operaciones internas de dirección.",
      sticky: true,
      skeleton: "hub",
    };
  }

  if (pathname === appRoutes.clothing.deliveries || pathname === "/admin/ropa/almacen/entregas") {
    return {
      title: "Registrar entrega",
      subtitle: "Elige al jugador y las prendas del almacén. Si hay dorsal, puedes buscar por número.",
      back: { href: appRoutes.clothing.hub, label: "Gestión de ropa" },
      sticky: "tall",
      skeleton: "deliveries",
    };
  }

  if (pathname === appRoutes.clothing.products) {
    return {
      title: "Prendas",
      subtitle: "Catálogo interno de piezas del club. Las activas aparecen al crear pedidos.",
      back: { href: appRoutes.clothing.hub, label: "Gestión de ropa" },
      skeleton: "products",
    };
  }

  if (pathname === appRoutes.clothing.warehouse) {
    return {
      title: "Inventario",
      subtitle:
        "Stock por caja. Busca por prenda, talla o dorsal. Las entregas se registran desde Gestión de ropa.",
      back: { href: appRoutes.clothing.hub, label: "Gestión de ropa" },
      sticky: true,
      skeleton: "warehouse",
    };
  }

  if (pathname === appRoutes.clothing.locations) {
    return {
      title: "Cajas de almacén",
      subtitle:
        "Identifica cada caja con un código. El armario es opcional: sirve para agruparlas cuando las tengas juntas.",
      back: { href: appRoutes.clothing.warehouse, label: "Inventario" },
      skeleton: "locations",
    };
  }

  if (pathname === appRoutes.clothing.newOrder) {
    return {
      title: "Nuevo pedido",
      subtitle: "Crea un borrador con líneas de prenda, talla y cantidad.",
      back: { href: appRoutes.clothing.orders, label: "Pedidos" },
      sticky: true,
      skeleton: "order-form",
    };
  }

  if (pathname === appRoutes.clothing.orders) {
    return {
      title: "Pedidos a proveedor",
      subtitle: "Flujo desde borrador hasta serigrafía. En escritorio puedes alternar kanban o lista.",
      sticky: true,
      skeleton: "orders",
      action: { href: appRoutes.clothing.newOrder, label: "Nuevo pedido" },
    };
  }

  if (pathname.startsWith(`${appRoutes.clothing.orders}/`)) {
    return {
      title: "Pedido",
      back: { href: appRoutes.clothing.orders, label: "Pedidos" },
      sticky: true,
      skeleton: "order-detail",
    };
  }

  if (pathname === appRoutes.parents) {
    return {
      title: "Tu familia",
      subtitle: "Consulta cuotas anotadas y reservas de equipación cuando conectemos los datos.",
      skeleton: "parents",
    };
  }

  if (pathname === appRoutes.profile) {
    return {
      title: "Tu perfil",
      subtitle: "Aquí podrás consultar tus datos de cuenta cuando conectemos Supabase.",
      skeleton: "profile",
    };
  }

  return null;
}

export function getDashboardFrameClassName(chrome: DashboardRouteChrome | null) {
  if (chrome?.sticky === "tall") {
    return "clothing-page-with-sticky clothing-page-with-sticky--tall flex flex-col gap-6 sm:gap-8";
  }
  if (chrome?.sticky) {
    return "clothing-page-with-sticky flex flex-col gap-6";
  }
  if (chrome?.skeleton === "hub" || chrome?.skeleton === "admin") {
    return "flex flex-col gap-8 lg:gap-10";
  }
  return "flex flex-col gap-6";
}
