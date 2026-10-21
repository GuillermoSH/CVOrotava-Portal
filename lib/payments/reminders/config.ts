import "server-only";

import { PAYMENT_INSTRUCTIONS } from "@/lib/payments/reminders/instructions";

/**
 * Configuración de avisos desde variables de entorno (solo servidor).
 *  - RESEND_API_KEY / RESEND_FROM_EMAIL: envío. Opcional RESEND_REPLY_TO.
 *  - PAYMENT_REMINDERS_ENABLED=true: sin esto el cron NO envía nada.
 *  - PAYMENT_REMINDERS_TEST_TO: si existe, todo correo real se redirige a esa dirección.
 *  - CRON_SECRET: protege /api/cron/payment-reminders.
 */
export function getReminderConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim() || null;
  const from = process.env.RESEND_FROM_EMAIL?.trim() || null;
  return {
    apiKey,
    from,
    replyTo: process.env.RESEND_REPLY_TO?.trim() || null,
    emailConfigured: Boolean(apiKey && from),
    /** Cómo pagar: se edita en lib/payments/reminders/instructions.ts. */
    instructions: PAYMENT_INSTRUCTIONS,
    enabled: process.env.PAYMENT_REMINDERS_ENABLED === "true",
    testTo: process.env.PAYMENT_REMINDERS_TEST_TO?.trim() || null,
    cronSecret: process.env.CRON_SECRET?.trim() || null,
  };
}

export type ReminderConfig = ReturnType<typeof getReminderConfig>;
