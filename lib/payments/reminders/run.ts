import "server-only";

import { renderReminderEmail } from "@/lib/payments/reminders/email";
import { getReminderConfig } from "@/lib/payments/reminders/config";
import {
  listOwing,
  planReminders,
  type OwingPlayer,
  type ReminderHistoryEntry,
  type ReminderPlan,
} from "@/lib/payments/reminders/plan";
import {
  listContactEmails,
  listReminderHistory,
  logReminder,
} from "@/lib/payments/reminders/repository";
import { sendEmail } from "@/lib/payments/reminders/resend";
import { buildPlayerFeeRows } from "@/lib/payments/player-fee-rows";
import { listSeasonFeeLines } from "@/lib/payments/repository/fees";
import { listSeasonPaymentFacts } from "@/lib/payments/repository/payments";
import { listPlayersForPayments } from "@/lib/payments/repository/players";
import { getCurrentSeason } from "@/lib/season";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type PlannedReminder = ReminderPlan & {
  /** Emails de la familia (principal primero). Vacío = sin correo registrado. */
  recipients: string[];
};

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Ventana de historial: cubre la cadencia de 7 días con margen. */
const HISTORY_DAYS = 30;

async function loadFeeRows({
  today,
  historySince,
}: {
  today: Date;
  /** YYYY-MM-DD; sin valor no se lee el historial (pruebas). */
  historySince?: string;
}) {
  const db = createServiceRoleClient();
  const season = getCurrentSeason(today);

  const [players, lines, facts, history] = await Promise.all([
    listPlayersForPayments(db, season),
    listSeasonFeeLines(db, season),
    listSeasonPaymentFacts(db, season),
    historySince
      ? listReminderHistory(db, historySince)
      : Promise.resolve<ReminderHistoryEntry[]>([]),
  ]);

  const rows = buildPlayerFeeRows({ players, lines, paymentsByPlayer: facts, season, today });
  return { db, rows, history };
}

async function withRecipients(
  db: ReturnType<typeof createServiceRoleClient>,
  plans: ReminderPlan[],
): Promise<PlannedReminder[]> {
  const emails = await listContactEmails(
    db,
    plans.map((p) => p.playerId),
  );
  return plans.map((plan) => ({ ...plan, recipients: emails.get(plan.playerId) ?? [] }));
}

/** Plan de avisos de un día con destinatarios resueltos. Datos frescos (sin caché). */
export async function buildReminderPlan({ today }: { today: Date }): Promise<PlannedReminder[]> {
  const since = new Date(today);
  since.setDate(since.getDate() - HISTORY_DAYS);

  const { db, rows, history } = await loadFeeRows({
    today,
    historySince: dateKey(since),
  });
  return withRecipients(db, planReminders({ rows, today, history }));
}

export type ReminderPreview = {
  /** Avisos que saldrían ese día (pruebas: sin tener en cuenta lo ya enviado). */
  plans: PlannedReminder[];
  /** Todos los que tienen algo vencido, salga o no aviso ese día. */
  owing: OwingPlayer[];
};

/** Simulación de un día para la página de avisos: plan + lista de pendientes en una sola carga. */
export async function buildReminderPreview({ today }: { today: Date }): Promise<ReminderPreview> {
  const { db, rows } = await loadFeeRows({ today });
  const plans = await withRecipients(
    db,
    planReminders({ rows, today, history: [] }),
  );
  return { plans, owing: listOwing({ rows }) };
}

export type RunSummary = {
  mode: "disabled" | "not-configured" | "sent";
  planned: number;
  sent: number;
  failed: number;
  noEmail: number;
  redirectedTo: string | null;
};

/** Cron diario: calcula los avisos de hoy y los envía (solo si PAYMENT_REMINDERS_ENABLED). */
export async function runPaymentReminders(today: Date = new Date()): Promise<RunSummary> {
  const config = getReminderConfig();
  const plans = await buildReminderPlan({ today });
  const summary: RunSummary = {
    mode: "sent",
    planned: plans.length,
    sent: 0,
    failed: 0,
    noEmail: plans.filter((p) => p.recipients.length === 0).length,
    redirectedTo: config.testTo,
  };

  if (!config.enabled) return { ...summary, mode: "disabled" };
  if (!config.emailConfigured) return { ...summary, mode: "not-configured" };

  const db = createServiceRoleClient();
  const sentOn = dateKey(today);

  for (const plan of plans) {
    if (plan.recipients.length === 0 && !config.testTo) continue;

    const email = renderReminderEmail({
      kind: plan.kind,
      playerName: plan.playerName,
      items: plan.items,
      total: plan.total,
      instructions: config.instructions,
    });
    const testMode = config.testTo != null;
    const to = testMode ? [config.testTo as string] : plan.recipients;
    const outgoing = testMode
      ? { ...email, subject: `[PRUEBA → ${plan.recipients.join(", ") || "sin correo"}] ${email.subject}` }
      : email;

    const result = await sendEmail({
      config,
      to,
      email: outgoing,
      idempotencyKey: testMode ? undefined : `reminder-${plan.playerId}-${plan.kind}-${sentOn}`,
    });

    if (result.ok) summary.sent += 1;
    else summary.failed += 1;

    // En modo prueba no se registra: no debe bloquear ni espaciar los avisos reales.
    if (testMode) continue;
    await logReminder(db, {
      player_id: plan.playerId,
      kind: plan.kind,
      sent_on: sentOn,
      recipients: plan.recipients,
      items: plan.items,
      total: plan.total,
      status: result.ok ? "sent" : "failed",
      provider_id: result.ok ? result.id : null,
      error: result.ok ? null : result.error,
    });
  }

  return summary;
}
