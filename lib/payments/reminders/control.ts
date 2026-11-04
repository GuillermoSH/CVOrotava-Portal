import "server-only";

import { dbErrorMessage } from "@/lib/clothing/repository/helpers";
import { getReminderConfig } from "@/lib/payments/reminders/config";
import {
  groupLogByEmail,
  nextReminder,
  type LogRow,
  type LoggedEmail,
  type NextReminder,
} from "@/lib/payments/reminders/control-logic";
import { firstEmailProblem } from "@/lib/payments/reminders/email-quality";
import { listOwing, planReminders, type ReminderKind } from "@/lib/payments/reminders/plan";
import { countEmailsSentOn, listContactEmails } from "@/lib/payments/reminders/repository";
import { loadFeeRows } from "@/lib/payments/reminders/run";

const LOG_DAYS = 30;

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type DebtorControl = {
  playerId: string;
  playerName: string;
  teamName: string | null;
  total: number;
  hasLate: boolean;
  recipients: string[];
  /** Primer correo dudoso de la familia, si lo hay. */
  emailProblem: { email: string; hint: string } | null;
  lastSent: { kind: ReminderKind; on: string; deliveryStatus: string | null } | null;
  next: NextReminder;
  /** Sale en el próximo pase (hoy o con fecha vencida). */
  dueNow: boolean;
};

export type ReminderControl = {
  today: string;
  quota: { sentToday: number; limit: number };
  totals: {
    emails30d: number;
    failed30d: number;
    delivered: number;
    bounced: number;
    unchecked: number;
  };
  lastRunAt: string | null;
  debtors: DebtorControl[];
  log: LoggedEmail[];
  /** false = falta aplicar la migración de entregas. */
  hasDeliveryColumn: boolean;
};

type RawLogRow = Omit<LogRow, "player_name" | "delivery_status"> & {
  delivery_status?: string | null;
  players: { full_name: string } | { full_name: string }[] | null;
};

export async function buildReminderControl(today: Date = new Date()): Promise<ReminderControl> {
  const config = getReminderConfig();
  const todayKey = dateKey(today);
  const since = new Date(today);
  since.setDate(since.getDate() - LOG_DAYS);
  const sinceKey = dateKey(since);

  const { db, rows } = await loadFeeRows({ today });

  const baseColumns = "id, player_id, kind, sent_on, recipients, total, status, provider_id, error, created_at, players(full_name)";
  let hasDeliveryColumn = true;
  let { data: raw, error } = (await db
    .from("payment_reminders")
    .select(`${baseColumns}, delivery_status`)
    .gte("sent_on", sinceKey)
    .order("created_at", { ascending: false })) as { data: unknown[] | null; error: { code?: string; message: string } | null };
  if (error && error.code === "42703") {
    // Migración de entregas sin aplicar: se muestra el registro sin ese dato.
    hasDeliveryColumn = false;
    ({ data: raw, error } = (await db
      .from("payment_reminders")
      .select(baseColumns)
      .gte("sent_on", sinceKey)
      .order("created_at", { ascending: false })) as { data: unknown[] | null; error: { code?: string; message: string } | null });
  }
  if (error) throw new Error(dbErrorMessage(error));

  const logRows: LogRow[] = ((raw ?? []) as unknown as RawLogRow[]).map((r) => {
    const player = Array.isArray(r.players) ? r.players[0] : r.players;
    return { ...r, player_name: player?.full_name ?? "—", delivery_status: r.delivery_status ?? null };
  });
  const log = groupLogByEmail(logRows);

  const owing = listOwing({ rows });
  const history = logRows
    .filter((r) => r.status === "sent")
    .map((r) => ({ player_id: r.player_id, kind: r.kind, sent_on: r.sent_on }));
  const dueIds = new Set(planReminders({ rows, today, history }).map((p) => p.playerId));
  const emails = await listContactEmails(db, owing.map((o) => o.playerId));
  const monthPrefix = todayKey.slice(0, 7);

  const debtors: DebtorControl[] = owing.map((o) => {
    const sent = logRows
      .filter((r) => r.player_id === o.playerId && r.status === "sent")
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const lastLate = sent.filter((r) => r.kind === "atrasado").map((r) => r.sent_on).sort().at(-1) ?? null;
    const recipients = emails.get(o.playerId) ?? [];
    const next = nextReminder({
      today,
      hasLate: o.hasLate,
      lastLateSent: lastLate,
      avisoSentThisMonth: sent.some((r) => r.kind === "aviso" && r.sent_on.startsWith(monthPrefix)),
    });
    return {
      playerId: o.playerId,
      playerName: o.playerName,
      teamName: o.teamName,
      total: o.total,
      hasLate: o.hasLate,
      recipients,
      emailProblem: firstEmailProblem(recipients),
      lastSent: sent[0]
        ? { kind: sent[0].kind, on: sent[0].sent_on, deliveryStatus: sent[0].delivery_status }
        : null,
      next,
      dueNow: dueIds.has(o.playerId),
    };
  });

  const sentEmails = log.filter((e) => e.status === "sent");
  return {
    today: todayKey,
    quota: { sentToday: await countEmailsSentOn(db, todayKey), limit: config.dailyLimit },
    totals: {
      emails30d: sentEmails.length,
      failed30d: log.filter((e) => e.status === "failed").length,
      delivered: sentEmails.filter((e) => ["delivered", "opened", "clicked"].includes(e.deliveryStatus ?? "")).length,
      bounced: sentEmails.filter((e) => ["bounced", "complained", "failed", "suppressed"].includes(e.deliveryStatus ?? "")).length,
      unchecked: sentEmails.filter((e) => e.deliveryStatus == null).length,
    },
    lastRunAt: logRows[0]?.created_at ?? null,
    debtors,
    log,
    hasDeliveryColumn,
  };
}
