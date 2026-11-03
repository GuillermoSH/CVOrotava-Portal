import type { PlayerFeeRow } from "@/lib/payments/player-fee-rows";

/**
 * Qué aviso de pago toca enviar hoy a cada jugador. Lógica pura (sin base de datos ni
 * correo): el cron y la página de pruebas usan el mismo plan.
 *
 *  - aviso:        desde el día 10 del mes, hay algo vencido pero nada atrasado y aún no se avisó
 *                  este mes (si el día 10 no salió, p. ej. por el tope diario, sale al siguiente).
 *  - ultimo_aviso: último día del mes, igual que antes (hoy termina el plazo).
 *  - atrasado:     hay algo atrasado (su mes ya terminó); se repite cada 7 días.
 */

export type ReminderKind = "aviso" | "ultimo_aviso" | "atrasado";

/** Días mínimos entre dos avisos "atrasado" al mismo jugador. */
export const LATE_REPEAT_DAYS = 7;

export type ReminderItem = {
  label: string;
  /** Mes natural (1–12) en mensualidades; null en pagos únicos. */
  month: number | null;
  remaining: number;
};

export type ReminderPlan = {
  playerId: string;
  playerName: string;
  teamName: string | null;
  kind: ReminderKind;
  items: ReminderItem[];
  total: number;
};

export type ReminderHistoryEntry = {
  player_id: string;
  kind: ReminderKind;
  /** YYYY-MM-DD */
  sent_on: string;
};

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/** YYYY-MM-DD en calendario local. */
function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isLastDayOfMonth(date: Date): boolean {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getDate() === 1;
}

/** Días naturales entre dos YYYY-MM-DD (b − a). */
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export type OwingItem = ReminderItem & { late: boolean };

export type OwingPlayer = {
  playerId: string;
  playerName: string;
  teamName: string | null;
  items: OwingItem[];
  total: number;
  /** Alguno de sus pagos ya está atrasado (su mes terminó). */
  hasLate: boolean;
};

/**
 * Todos los jugadores con algo vencido sin cobrar, independientemente del día (a diferencia
 * de `planReminders`, que solo dice a quién toca escribir hoy). Base de la lista para WhatsApp.
 */
export function listOwing({
  rows,
  excludePlayerIds,
}: {
  rows: readonly PlayerFeeRow[];
  excludePlayerIds?: ReadonlySet<string>;
}): OwingPlayer[] {
  const out: OwingPlayer[] = [];
  for (const row of rows) {
    if (excludePlayerIds?.has(row.id)) continue;
    const items = row.obligations
      .filter((o) => o.overdue && o.remaining > 0)
      .map((o) => ({ label: o.label, month: o.month, remaining: o.remaining, late: o.late }));
    if (items.length === 0) continue;
    out.push({
      playerId: row.id,
      playerName: row.full_name,
      teamName: row.team_name,
      items,
      total: roundCents(items.reduce((acc, i) => acc + i.remaining, 0)),
      hasLate: items.some((i) => i.late),
    });
  }
  return out;
}

export function planReminders({
  rows,
  today,
  history,
  excludePlayerIds,
}: {
  rows: readonly PlayerFeeRow[];
  today: Date;
  history: readonly ReminderHistoryEntry[];
  /** Jugadores a ignorar (bajas). */
  excludePlayerIds?: ReadonlySet<string>;
}): ReminderPlan[] {
  const todayKey = dateKey(today);
  const lastDay = isLastDayOfMonth(today);
  const dueFromDay = today.getDate() >= 10;
  const monthPrefix = todayKey.slice(0, 7);

  const sentByPlayer = new Map<string, ReminderHistoryEntry[]>();
  for (const entry of history) {
    const list = sentByPlayer.get(entry.player_id) ?? [];
    list.push(entry);
    sentByPlayer.set(entry.player_id, list);
  }

  const plans: ReminderPlan[] = [];

  for (const row of rows) {
    if (excludePlayerIds?.has(row.id)) continue;

    const open = row.obligations.filter((o) => o.overdue && o.remaining > 0);
    if (open.length === 0) continue;

    const sent = sentByPlayer.get(row.id) ?? [];
    const hasLate = open.some((o) => o.late);

    let kind: ReminderKind | null = null;
    if (hasLate) {
      const lastLate = sent
        .filter((s) => s.kind === "atrasado")
        .map((s) => s.sent_on)
        .sort()
        .at(-1);
      if (!lastLate || daysBetween(lastLate, todayKey) >= LATE_REPEAT_DAYS) kind = "atrasado";
    } else if (lastDay) {
      kind = "ultimo_aviso";
    } else if (dueFromDay && !sent.some((s) => s.kind === "aviso" && s.sent_on.startsWith(monthPrefix))) {
      kind = "aviso";
    }

    if (!kind) continue;
    if (sent.some((s) => s.kind === kind && s.sent_on === todayKey)) continue;

    const items = open.map((o) => ({ label: o.label, month: o.month, remaining: o.remaining }));
    plans.push({
      playerId: row.id,
      playerName: row.full_name,
      teamName: row.team_name,
      kind,
      items,
      total: roundCents(items.reduce((acc, i) => acc + i.remaining, 0)),
    });
  }

  return plans;
}

/** Orden de envío cuando no caben todos: lo más urgente primero. */
const KIND_PRIORITY: Record<ReminderKind, number> = { ultimo_aviso: 0, aviso: 1, atrasado: 2 };

/** Último aviso, luego aviso, luego atrasado; dentro de cada tipo, la deuda mayor primero. */
export function prioritizePlans<T extends ReminderPlan>(plans: readonly T[]): T[] {
  return [...plans].sort(
    (a, b) =>
      KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind] ||
      b.total - a.total ||
      a.playerName.localeCompare(b.playerName, "es"),
  );
}

/**
 * Reparte los avisos entre lo que cabe hoy y lo que queda para el siguiente pase. `cost` es lo que
 * gasta cada aviso de la cuota diaria del proveedor (un correo por destinatario). Respeta el
 * orden recibido y salta los que no caben para aprovechar el hueco con otros más baratos.
 */
export function applyDailyCap<T>(
  plans: readonly T[],
  { remaining, cost }: { remaining: number; cost: (plan: T) => number },
): { send: T[]; deferred: T[] } {
  const send: T[] = [];
  const deferred: T[] = [];
  let used = 0;
  for (const plan of plans) {
    const c = cost(plan);
    if (used + c <= remaining) {
      send.push(plan);
      used += c;
    } else {
      deferred.push(plan);
    }
  }
  return { send, deferred };
}

/** Gravedad para el tono de un correo con varios jugadores: manda el más grave. */
const TONE_RANK: Record<ReminderKind, number> = { atrasado: 0, ultimo_aviso: 1, aviso: 2 };

export type ReminderGroup<T extends ReminderPlan & { recipients: string[] }> = {
  /** Destinatarios normalizados y ordenados: dos jugadores con el mismo destino comparten clave. */
  key: string;
  recipients: string[];
  /** Jugadores de ese destino, por orden alfabético. */
  plans: T[];
  /** Tono del correo: el del aviso más grave del grupo. */
  kind: ReminderKind;
  /** Suma de lo pendiente de todos los jugadores del grupo. */
  total: number;
};

/**
 * Junta en un solo correo a los jugadores que tienen exactamente el mismo destino (hermanos con
 * los mismos tutores). Quien no tiene correo no entra: no hay destino al que escribir. Un destino
 * parcialmente compartido (A para uno, A y B para otro) no se mezcla: nadie recibe datos de un
 * jugador que no es suyo.
 */
export function groupByDestination<T extends ReminderPlan & { recipients: string[] }>(
  plans: readonly T[],
): ReminderGroup<T>[] {
  const groups = new Map<string, ReminderGroup<T>>();
  for (const plan of plans) {
    const recipients = [...new Set(plan.recipients.map((r) => r.trim().toLowerCase()).filter(Boolean))].sort();
    if (recipients.length === 0) continue;
    const key = recipients.join(",");
    const group = groups.get(key) ?? { key, recipients: plan.recipients, plans: [], kind: plan.kind, total: 0 };
    group.plans.push(plan);
    groups.set(key, group);
  }
  return [...groups.values()].map((g) => {
    const sorted = [...g.plans].sort((a, b) => a.playerName.localeCompare(b.playerName, "es"));
    const kind = sorted.reduce<ReminderKind>(
      (worst, p) => (TONE_RANK[p.kind] < TONE_RANK[worst] ? p.kind : worst),
      sorted[0].kind,
    );
    return { ...g, plans: sorted, kind, total: roundCents(sorted.reduce((acc, p) => acc + p.total, 0)) };
  });
}

/** Orden de envío de los correos: el aviso más urgente de cada grupo, luego la deuda mayor. */
export function prioritizeGroups<T extends ReminderPlan & { recipients: string[] }>(
  groups: readonly ReminderGroup<T>[],
): ReminderGroup<T>[] {
  const urgency = (g: ReminderGroup<T>) => Math.min(...g.plans.map((p) => KIND_PRIORITY[p.kind]));
  return [...groups].sort(
    (a, b) =>
      urgency(a) - urgency(b) ||
      b.total - a.total ||
      a.plans[0].playerName.localeCompare(b.plans[0].playerName, "es"),
  );
}
