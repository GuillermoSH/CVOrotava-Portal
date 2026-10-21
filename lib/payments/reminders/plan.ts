import type { PlayerFeeRow } from "@/lib/payments/player-fee-rows";

/**
 * Qué aviso de pago toca enviar hoy a cada jugador. Lógica pura (sin base de datos ni
 * correo): el cron y la página de pruebas usan el mismo plan.
 *
 *  - aviso:        día 10 del mes, hay algo vencido pero nada atrasado.
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
  const dueDay = today.getDate() === 10;

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
    } else if (dueDay) {
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
