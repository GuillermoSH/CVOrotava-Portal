import "server-only";

import { getConfiguredSiteOrigin } from "@/lib/auth/app-origin";
import { PAYMENT_INSTRUCTIONS } from "@/lib/payments/reminders/instructions";

/**
 * Configuración de avisos desde variables de entorno (solo servidor).
 *  - RESEND_API_KEY / RESEND_FROM_EMAIL: envío. Opcional RESEND_REPLY_TO.
 *  - PAYMENT_REMINDERS_ENABLED=true: sin esto el cron NO envía nada.
 *  - PAYMENT_REMINDERS_TEST_TO: si existe, todo correo real se redirige a esa dirección.
 *  - CRON_SECRET: protege /api/cron/payment-reminders.
 *  - PAYMENT_REMINDERS_DAILY_LIMIT: tope de correos de avisos por día (por defecto 80). El plan
 *    gratuito de Resend admite 100 al día en total, así que se deja margen para otros envíos
 *    (avisos de vídeo, pruebas). Lo que no cabe queda para el siguiente pase.
 */

const DEFAULT_DAILY_LIMIT = 80;

function parseDailyLimit(value: string | undefined): number {
  const n = Number.parseInt(value?.trim() ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DAILY_LIMIT;
}
/**
 * Logo del correo: URL absoluta pública. Orden: REMINDER_EMAIL_LOGO_URL, dominio de producción en
 * Vercel y, por último, el sitio configurado (si no es local/LAN: el cliente de correo no lo alcanzaría).
 */
function emailLogoUrl(): string | null {
  const override = process.env.REMINDER_EMAIL_LOGO_URL?.trim();
  if (override) return override;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}/logo/email-logo.png`;
  const origin = getConfiguredSiteOrigin();
  const isPrivate = /^https?:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin);
  return origin && !isPrivate ? `${origin}/logo/email-logo.png` : null;
}

export function getReminderConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim() || null;
  const from = process.env.RESEND_FROM_EMAIL?.trim() || null;
  return {
    apiKey,
    from,
    replyTo: process.env.RESEND_REPLY_TO?.trim() || null,
    emailConfigured: Boolean(apiKey && from),
    /** Cómo pagar: se edita en lib/payments/reminders/instructions.ts. */
    logoUrl: emailLogoUrl(),
    instructions: PAYMENT_INSTRUCTIONS,
    dailyLimit: parseDailyLimit(process.env.PAYMENT_REMINDERS_DAILY_LIMIT),
    enabled: process.env.PAYMENT_REMINDERS_ENABLED === "true",
    testTo: process.env.PAYMENT_REMINDERS_TEST_TO?.trim() || null,
    cronSecret: process.env.CRON_SECRET?.trim() || null,
  };
}

export type ReminderConfig = ReturnType<typeof getReminderConfig>;
