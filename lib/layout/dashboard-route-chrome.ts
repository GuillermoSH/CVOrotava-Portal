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
  sticky?: boolean | "tall" | "bulk";
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
      sticky: "bulk",
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

  if (pathname === appRoutes.payments.list) {
    return {
      title: "Pagos",
      subtitle:
        "Anota pagos ya recibidos (transferencia o efectivo) y consulta quién falta por pagar la matrícula.",
      sticky: true,
      skeleton: "products",
    };
  }

  if (pathname === appRoutes.payments.concepts) {
    return {
      title: "Conceptos predefinidos",
      subtitle: "Cuotas, matrícula y otros importes fijos para agilizar el registro de pagos.",
      back: { href: appRoutes.payments.list, label: "Pagos" },
      skeleton: "products",
    };
  }

  if (pathname === appRoutes.clothing.hub) {
    return {
      title: "Ropa",
      subtitle: "Pedido activo, almacén y entregas.",
      skeleton: "hub",
    };
  }

  if (pathname === appRoutes.clothing.deliveries || pathname === "/admin/ropa/almacen/entregas") {
    return {
      title: "Entregas",
      subtitle: "Registra entrega al jugador y consulta historial.",
      back: { href: appRoutes.clothing.hub, label: "Ropa" },
      sticky: "tall",
      skeleton: "deliveries",
    };
  }

  if (pathname === appRoutes.clothing.products) {
    return {
      title: "Prendas",
      subtitle: "Catálogo del club. Activas = disponibles en pedidos.",
      back: { href: appRoutes.clothing.hub, label: "Ropa" },
      skeleton: "products",
    };
  }

  if (pathname === appRoutes.clothing.warehouse) {
    return {
      title: "Almacén",
      subtitle: "Stock por caja. Busca prenda, talla o dorsal.",
      back: { href: appRoutes.clothing.hub, label: "Ropa" },
      sticky: true,
      skeleton: "warehouse",
    };
  }

  if (pathname === appRoutes.clothing.addStock) {
    return {
      title: "Carga por lote",
      subtitle: "Componer tallas o dorsales de una prenda y confirmar.",
      back: { href: appRoutes.clothing.warehouse, label: "Almacén" },
      sticky: true,
      skeleton: "warehouse",
    };
  }

  if (pathname === appRoutes.clothing.locations) {
    return {
      title: "Cajas",
      subtitle: "Códigos de caja; armario opcional para agrupar.",
      back: { href: appRoutes.clothing.warehouse, label: "Almacén" },
      skeleton: "locations",
    };
  }

  if (pathname === appRoutes.clothing.newOrder) {
    return {
      title: "Nuevo pedido",
      subtitle: "Borrador con prenda, talla y cantidad.",
      back: { href: appRoutes.clothing.orders, label: "Pedidos" },
      sticky: true,
      skeleton: "order-form",
    };
  }

  if (pathname === appRoutes.clothing.orders) {
    return {
      title: "Pedidos",
      subtitle: "De borrador a serigrafía. Lista o kanban en escritorio.",
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
  if (chrome?.sticky === "bulk") {
    return "clothing-page-with-sticky clothing-page-with-sticky--bulk flex flex-col gap-4";
  }
  if (chrome?.sticky === "tall") {
    return "clothing-page-with-sticky clothing-page-with-sticky--tall flex flex-col gap-4";
  }
  if (chrome?.sticky) {
    return "clothing-page-with-sticky flex flex-col gap-4";
  }
  if (chrome?.skeleton === "hub" || chrome?.skeleton === "admin") {
    return "flex flex-col gap-6";
  }
  return "flex flex-col gap-4";
}
