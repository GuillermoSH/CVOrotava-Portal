"use server";

import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { getReminderConfig } from "@/lib/payments/reminders/config";
import { renderReminderEmail } from "@/lib/payments/reminders/email";
import { sendEmail } from "@/lib/payments/reminders/resend";
import { buildReminderPreview, type ReminderPreview } from "@/lib/payments/reminders/run";
import { createClient } from "@/lib/supabase/server";

export type PreviewRemindersResult =
  | ({ ok: true } & ReminderPreview)
  | { ok: false; error: string };

export type TestSendResult = { ok: true; to: string } | { ok: false; error: string };

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const m = DATE_RE.exec(value);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Qué avisos saldrían en `date` (pruebas: ignora el historial de envíos). */
export async function previewRemindersAction(date: unknown): Promise<PreviewRemindersResult> {
  try {
    await requirePaymentsWriteAccess();
    const day = parseDate(date);
    if (!day) return { ok: false, error: "Fecha no válida" };
    return { ok: true, ...(await buildReminderPreview({ today: day })) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo calcular el plan" };
  }
}

/** Manda el correo de un jugador a la dirección de quien lo pide, marcado como prueba. No se registra. */
export async function sendTestReminderAction(input: {
  date: unknown;
  playerId: unknown;
}): Promise<TestSendResult> {
  try {
    await requirePaymentsWriteAccess();
    const day = parseDate(input.date);
    if (!day || typeof input.playerId !== "string") return { ok: false, error: "Datos inválidos" };

    const config = getReminderConfig();
    if (!config.emailConfigured) {
      return { ok: false, error: "Falta RESEND_API_KEY o RESEND_FROM_EMAIL en el servidor" };
    }

    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const to = data.user?.email;
    if (!to) return { ok: false, error: "Tu usuario no tiene correo" };

    const { plans } = await buildReminderPreview({ today: day });
    const plan = plans.find((p) => p.playerId === input.playerId);
    if (!plan) return { ok: false, error: "Ese jugador no tiene aviso en esa fecha" };

    const email = renderReminderEmail({
      kind: plan.kind,
      playerName: plan.playerName,
      items: plan.items,
      total: plan.total,
      instructions: config.instructions,
    });
    const result = await sendEmail({
      config,
      to: [to],
      email: { ...email, subject: `[PRUEBA] ${email.subject}` },
    });
    return result.ok ? { ok: true, to } : { ok: false, error: result.error };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo enviar la prueba" };
  }
}
