import { appRoutes } from "@/lib/constants";
import type { PaymentsDashboard } from "@/lib/payments/dashboard-stats";
import {
  TEAM_FACET_NONE,
  playersListHref,
  type ChecklistFilter,
  type PlayerFacet,
} from "@/lib/roster/player-filters";
import { CHECKLIST_FILTER_LABELS } from "@/lib/roster/player-filters";
import { isPlayerProfileIncomplete } from "@/lib/roster/profile-completeness";
import { getPlayerOnboardingStatus } from "@/lib/roster/onboarding";
import type { PlayerListItem } from "@/lib/types/db";
import { formatEur } from "@/lib/format/currency";

/**
 * Lo pendiente en toda la app, listo para el inicio de /admin: jugadores (alta y ficha), pagos y
 * ropa. Lógica pura: cada fila dice cuántos son, por qué importa y adónde ir a resolverlo.
 */

export type PendingItem = {
  id: string;
  label: string;
  /** Cuántos jugadores / pedidos / cobros son; las filas a 0 no se muestran. */
  count: number;
  /** Cifra que se pinta si no es el recuento (p. ej. un importe). */
  valueLabel?: string;
  /** Línea de apoyo: por qué importa o qué cantidad suma. */
  detail?: string;
  href: string;
};

export type PendingGroup = {
  id: "players" | "payments" | "clothing";
  title: string;
  items: PendingItem[];
};

export type ClothingPending = {
  openOrders: number;
  pendingStorageLots: number;
  pendingStorageUnits: number;
};


const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function checklistHref(filter: ChecklistFilter): string {
  const facet: PlayerFacet = { key: "checklist", value: filter, label: CHECKLIST_FILTER_LABELS[filter] };
  return playersListHref({ query: "", facets: [facet], statusFilter: "active" });
}

/** Resumen del alta de la plantilla activa: base de la cifra «altas completas». */
export function summarizeRoster(players: readonly PlayerListItem[]) {
  const active = players.filter((p) => p.is_active);
  const complete = active.filter((p) => getPlayerOnboardingStatus(p).isComplete).length;
  return { active: active.length, complete, incomplete: active.length - complete };
}

export function buildPendingGroups({
  players,
  payments,
  clothing,
}: {
  players: readonly PlayerListItem[];
  /** null = el rol no ve datos económicos. */
  payments: PaymentsDashboard | null;
  clothing: ClothingPending;
}): PendingGroup[] {
  const active = players.filter((p) => p.is_active);

  const count = (predicate: (p: PlayerListItem) => boolean) => active.filter(predicate).length;
  const licenseMissing = count((p) => !p.license_completed);
  const licenseBlocked = count(
    (p) => !p.license_completed && (!p.registration_papers_received || !p.photo_taken),
  );

  const playerItems: PendingItem[] = [
    {
      id: "license",
      label: "Licencia federativa sin completar",
      count: licenseMissing,
      detail:
        licenseBlocked > 0
          ? `${plural(licenseBlocked, "bloqueada", "bloqueadas")} por papeles o foto`
          : "Con papeles y foto ya recibidos",
      href: checklistHref("missing_license"),
    },
    {
      id: "papers",
      label: "Papeles de inscripción sin recibir",
      count: count((p) => !p.registration_papers_received),
      href: checklistHref("missing_papers"),
    },
    {
      id: "docs",
      label: "Documentación sin entregar a la familia",
      count: count((p) => !p.docs_delivered_to_family),
      href: checklistHref("missing_docs"),
    },
    {
      id: "photo",
      label: "Foto de ficha sin hacer",
      count: count((p) => !p.photo_taken),
      href: checklistHref("missing_photo"),
    },
    {
      id: "profile",
      label: "Fichas con datos por completar",
      count: count((p) => isPlayerProfileIncomplete(p)),
      detail: "Domicilio, contacto o documento",
      href: checklistHref("incomplete_profile"),
    },
    {
      id: "no-team",
      label: "Jugadores sin equipo",
      count: count((p) => !p.team_id),
      href: playersListHref({
        query: "",
        facets: [{ key: "team", value: TEAM_FACET_NONE, label: "Sin equipo" }],
        statusFilter: "active",
      }),
    },
    {
      id: "no-email",
      label: "Sin correo registrado",
      count: count((p) => !p.primary_email?.trim()),
      detail: "No les llegan los avisos de pago por correo",
      href: appRoutes.players.list,
    },
  ];

  const paymentItems: PendingItem[] = payments
    ? [
        {
          id: "overdue",
          label: "Pagos vencidos sin cobrar",
          count: payments.overduePlayers,
          valueLabel: plural(payments.overduePlayers, "jugador", "jugadores"),
          detail: `${formatEur(payments.overdueTotal)} · ${payments.debtors.length} con algo atrasado`,
          href: appRoutes.payments.list,
        },
        {
          id: "matricula",
          label: "Matrícula pendiente de cobro",
          count: payments.withoutMatricula.players,
          valueLabel: plural(payments.withoutMatricula.players, "jugador", "jugadores"),
          detail: formatEur(payments.withoutMatricula.amount),
          href: checklistHref("missing_matricula"),
        },
        {
          id: "unassigned",
          label: "Cobros sin concepto asignado",
          count: payments.unassigned.count,
          detail: `${formatEur(payments.unassigned.total)} · no suman en lo cobrado`,
          href: appRoutes.payments.list,
        },
        {
          id: "overpaid",
          label: "Cobrado de más",
          count: payments.overpaid > 0 ? 1 : 0,
          valueLabel: formatEur(payments.overpaid),
          detail: "Un mismo concepto anotado más de una vez",
          href: appRoutes.payments.list,
        },
      ]
    : [];

  const clothingItems: PendingItem[] = [
    {
      id: "orders",
      label: "Pedidos de ropa abiertos",
      count: clothing.openOrders,
      href: appRoutes.clothing.orders,
    },
    {
      id: "storage",
      label: "Ropa recibida por ubicar en el almacén",
      count: clothing.pendingStorageLots,
      valueLabel: plural(clothing.pendingStorageUnits, "unidad", "unidades"),
      detail: plural(clothing.pendingStorageLots, "lote", "lotes"),
      href: appRoutes.clothing.warehouse,
    },
  ];

  const groups: PendingGroup[] = [
    { id: "payments", title: "Pagos", items: paymentItems },
    { id: "players", title: "Jugadores", items: playerItems },
    { id: "clothing", title: "Ropa", items: clothingItems },
  ];
  return groups
    .map((g) => ({ ...g, items: g.items.filter((item) => item.count > 0) }))
    .filter((g) => g.items.length > 0);
}
