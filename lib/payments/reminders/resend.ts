import "server-only";

import type { ReminderConfig } from "@/lib/payments/reminders/config";
import type { RenderedEmail } from "@/lib/payments/reminders/email";

export type SendResult = { ok: true; id: string | null } | { ok: false; error: string };

/** Envío por la API REST de Resend (sin dependencia extra). */
export async function sendEmail({
  config,
  to,
  email,
  idempotencyKey,
}: {
  config: ReminderConfig;
  to: string[];
  email: RenderedEmail;
  idempotencyKey?: string;
}): Promise<SendResult> {
  if (!config.apiKey || !config.from) {
    return { ok: false, error: "Falta RESEND_API_KEY o RESEND_FROM_EMAIL" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: config.from,
        to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(config.replyTo ? { reply_to: config.replyTo } : {}),
      }),
    });

    const body = (await res.json().catch(() => null)) as
      | { id?: string; message?: string }
      | null;
    if (!res.ok) return { ok: false, error: body?.message ?? `Resend respondió ${res.status}` };
    return { ok: true, id: body?.id ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error de red al enviar" };
  }
}
