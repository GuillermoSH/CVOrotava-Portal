import "server-only";

import { createHash } from "node:crypto";

import { renderReminderGroupEmail } from "@/lib/payments/reminders/email";
import { getReminderConfig } from "@/lib/payments/reminders/config";
import {
  applyDailyCap,
  listOwing,
  planReminders,
  groupByDestination,
  prioritizeGroups,
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
import { listSeasonWaivers } from "@/lib/payments/repository/waivers";
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

export async function loadFeeRows({
  today,
  historySince,
}: {
  today: Date;
  /** YYYY-MM-DD; sin valor no se lee el historial (pruebas). */
  historySince?: string;
}) {
  const db = createServiceRoleClient();
  const season = getCurrentSeason(today);

  const [players, lines, facts, history, exemptPlayerIds, waiversByPlayer] = await Promise.all([
    listPlayersForPayments(db, season),
    listSeasonFeeLines(db, season),
    listSeasonPaymentFacts(db, season),
    historySince
      ? listReminderHistory(db, historySince)
      : Promise.resolve<ReminderHistoryEntry[]>([]),
    listExemptPlayerIds(db, season),
    listSeasonWaivers(db, season),
  ]);

  const rows = buildPlayerFeeRows({
    players,
    lines,
    paymentsByPlayer: facts,
    season,
    today,
    exemptPlayerIds,
    waiversByPlayer,
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
  /** Avisos planificados, uno por jugador. */
  planned: number;
  /** Avisos planificados por tipo (por jugador). */
  byKind: Record<ReminderKind, number>;
  /** Correos que saldrían: los jugadores con el mismo destino van juntos en uno. */
  emails: number;
  /** Correos con destino y sin enviar en este pase (tope diario, cuota del proveedor o tiempo): salen en el siguiente. */
  deferred: number;
  dailyLimit: number;
  /** Correos de avisos ya enviados hoy antes de este pase. */
  alreadySentToday: number;
  /** Correos enviados / fallidos en este pase. */
  sent: number;
  failed: number;
  /** Jugadores con aviso pero sin ningún correo registrado. */
  noEmail: number;
  redirectedTo: string | null;
};

/** Clave de idempotencia de un correo: mismos jugadores, tipos e importes el mismo día = mismo envío. */
function emailIdempotencyKey(plans: readonly PlannedReminder[], sentOn: string): string {
  const fingerprint = [...plans]
    .map((p) => `${p.playerId}:${p.kind}:${p.total}`)
    .sort()
    .join("|");
  return `reminder-${createHash("sha1").update(fingerprint).digest("hex")}-${sentOn}`;
}

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

  // Un correo por destino: los hermanos con los mismos tutores se juntan en un solo mensaje.
  const groups = prioritizeGroups(groupByDestination(allPlans));

  // Cuota diaria del proveedor: se descuenta lo ya enviado hoy y lo que no cabe queda para el
  // siguiente pase (las reglas de plan.ts vuelven a proponerlo: atrasado y aviso se recuperan).
  // En modo prueba nada se registra, así que no hay nada que descontar.
  const alreadySentToday = testMode ? 0 : await countEmailsSentOn(db, sentOn);
  const remaining = Math.max(0, config.dailyLimit - alreadySentToday);
  const cost = (group: (typeof groups)[number]) => (testMode ? 1 : group.recipients.length);

  const { send } = applyDailyCap(groups, { remaining, cost });
  const batch = options.limit != null && options.limit >= 0 ? send.slice(0, options.limit) : send;

  const summary: RunSummary = {
    mode: "sent",
    planned: allPlans.length,
    byKind,
    emails: groups.length,
    sent: 0,
    failed: 0,
    noEmail: allPlans.filter((p) => p.recipients.length === 0).length,
    deferred: groups.length - batch.length,
    dailyLimit: config.dailyLimit,
    alreadySentToday,
    redirectedTo: config.testTo,
  };

  if (options.dryRun) return { ...summary, mode: "dry-run" };
  if (!config.enabled) return { ...summary, mode: "disabled" };
  if (!config.emailConfigured) return { ...summary, mode: "not-configured" };

  const started = Date.now();
  let attempted = 0;

  for (const group of batch) {
    // Presupuesto de tiempo: lo que falte lo recoge el reintento de la misma tarde.
    if (Date.now() - started > RUN_BUDGET_MS) break;
    const turnStart = Date.now();

    const email = renderReminderGroupEmail(group, {
      instructions: config.instructions,
      logoUrl: config.logoUrl,
    });
    const to = testMode ? [config.testTo as string] : group.recipients;
    const outgoing = testMode
      ? { ...email, subject: `[PRUEBA → ${group.recipients.join(", ")}] ${email.subject}` }
      : email;

    const result = await sendEmail({
      config,
      to,
      email: outgoing,
      idempotencyKey: testMode ? undefined : emailIdempotencyKey(group.plans, sentOn),
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
    // Un correo combinado deja una fila por jugador (el antirrepetido es por jugador y tipo).
    if (!testMode) {
      for (const plan of group.plans) {
        await logReminder(db, {
          player_id: plan.playerId,
          kind: plan.kind,
          sent_on: sentOn,
          recipients: group.recipients,
          items: plan.items,
          total: plan.total,
          status: result.ok ? "sent" : "failed",
          provider_id: result.ok ? result.id : null,
          error: result.ok ? null : result.error,
        });
      }
    }

    const wait = MIN_GAP_MS - (Date.now() - turnStart);
    if (wait > 0) await sleep(wait);
  }

  summary.deferred = groups.length - attempted;
  return summary;
}
