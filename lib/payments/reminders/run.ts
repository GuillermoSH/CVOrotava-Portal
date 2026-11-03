import "server-only";

import { renderReminderEmail } from "@/lib/payments/reminders/email";
import { getReminderConfig } from "@/lib/payments/reminders/config";
import {
  applyDailyCap,
  listOwing,
  planReminders,
  prioritizePlans,
  type OwingPlayer,
  type ReminderHistoryEntry,
  type ReminderKind,
  type ReminderPlan,
} from "@/lib/payments/reminders/plan";
import {
  countEmailsSentOn,
  listContactEmails,
  listReminderHistory,
  logReminder,
} from "@/lib/payments/reminders/repository";
import { isQuotaExhausted, sendEmail } from "@/lib/payments/reminders/resend";
import { buildPlayerFeeRows } from "@/lib/payments/player-fee-rows";
import { listExemptPlayerIds } from "@/lib/payments/repository/exemptions";
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

  const [players, lines, facts, history, exemptPlayerIds] = await Promise.all([
    listPlayersForPayments(db, season),
    listSeasonFeeLines(db, season),
    listSeasonPaymentFacts(db, season),
    historySince
      ? listReminderHistory(db, historySince)
      : Promise.resolve<ReminderHistoryEntry[]>([]),
    listExemptPlayerIds(db, season),
  ]);

  const rows = buildPlayerFeeRows({
    players,
    lines,
    paymentsByPlayer: facts,
    season,
    today,
    exemptPlayerIds,
  });
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

export type RunOptions = {
  /** Calcula y cuenta los avisos de hoy sin enviar nada ni registrar nada. */
  dryRun?: boolean;
  /** Envía como mucho N avisos (para probar el envío real con un solo correo). */
  limit?: number;
};

/** Margen para que la función no pase de su tiempo máximo (60 s): lo que falte sale en el reintento. */
const RUN_BUDGET_MS = 48_000;
/** Resend admite 2 peticiones por segundo: se espacian los envíos. */
const MIN_GAP_MS = 520;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type RunSummary = {
  mode: "disabled" | "not-configured" | "dry-run" | "sent";
  planned: number;
  /** Avisos planificados por tipo. */
  byKind: Record<ReminderKind, number>;
  /** Con correo y sin enviar en este pase (tope diario, cuota del proveedor o tiempo): salen en el siguiente. */
  deferred: number;
  dailyLimit: number;
  /** Correos de avisos ya enviados hoy antes de este pase. */
  alreadySentToday: number;
  sent: number;
  failed: number;
  noEmail: number;
  redirectedTo: string | null;
};

/** Cron diario: calcula los avisos de hoy y los envía (solo si PAYMENT_REMINDERS_ENABLED). */
export async function runPaymentReminders(
  today: Date = new Date(),
  options: RunOptions = {},
): Promise<RunSummary> {
  const config = getReminderConfig();
  const db = createServiceRoleClient();
  const sentOn = dateKey(today);
  const testMode = config.testTo != null;

  const allPlans = await buildReminderPlan({ today });
  const byKind: Record<ReminderKind, number> = { aviso: 0, ultimo_aviso: 0, atrasado: 0 };
  for (const plan of allPlans) byKind[plan.kind] += 1;

  // Cuota diaria del proveedor: se descuenta lo ya enviado hoy y lo que no cabe queda para el
  // siguiente pase (las reglas de plan.ts vuelven a proponerlo: atrasado y aviso se recuperan).
  // En modo prueba nada se registra, así que no hay nada que descontar.
  const alreadySentToday = testMode ? 0 : await countEmailsSentOn(db, sentOn);
  const remaining = Math.max(0, config.dailyLimit - alreadySentToday);
  const cost = (plan: PlannedReminder) => (testMode ? 1 : plan.recipients.length);

  const withEmail = prioritizePlans(allPlans.filter((p) => cost(p) > 0));
  const { send } = applyDailyCap(withEmail, { remaining, cost });
  const plans =
    options.limit != null && options.limit >= 0 ? send.slice(0, options.limit) : send;

  const summary: RunSummary = {
    mode: "sent",
    planned: allPlans.length,
    byKind,
    sent: 0,
    failed: 0,
    noEmail: allPlans.filter((p) => p.recipients.length === 0).length,
    deferred: withEmail.length - plans.length,
    dailyLimit: config.dailyLimit,
    alreadySentToday,
    redirectedTo: config.testTo,
  };

  if (options.dryRun) return { ...summary, mode: "dry-run" };
  if (!config.enabled) return { ...summary, mode: "disabled" };
  if (!config.emailConfigured) return { ...summary, mode: "not-configured" };

  const started = Date.now();
  let attempted = 0;

  for (const plan of plans) {
    // Presupuesto de tiempo: lo que falte lo recoge el reintento de la misma tarde.
    if (Date.now() - started > RUN_BUDGET_MS) break;
    const turnStart = Date.now();

    const email = renderReminderEmail({
      kind: plan.kind,
      playerName: plan.playerName,
      items: plan.items,
      total: plan.total,
      instructions: config.instructions,
      logoUrl: config.logoUrl,
    });
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
    attempted += 1;

    // Cuota agotada: no se registra como fallo (no es culpa del aviso) y se corta; el resto queda
    // pendiente y volverá a proponerse en el siguiente pase.
    if (isQuotaExhausted(result)) {
      attempted -= 1;
      break;
    }

    if (result.ok) summary.sent += 1;
    else summary.failed += 1;

    // En modo prueba no se registra: no debe bloquear ni espaciar los avisos reales.
    if (!testMode) {
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

    const wait = MIN_GAP_MS - (Date.now() - turnStart);
    if (wait > 0) await sleep(wait);
  }

  summary.deferred = withEmail.length - attempted;
  return summary;
}
