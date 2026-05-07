"use server";

export type NotifyDebtorsResult =
  | { ok: true; sent: number }
  | { ok: false; reason: "email-not-configured" | "no-recipients" };

/**
 * Envío masivo de avisos a morosos críticos.
 * Stub: cuando exista Resend, sustituir por envío real con `RESEND_API_KEY` (solo servidor).
 */
export async function notifyCriticalDebtors(): Promise<NotifyDebtorsResult> {
  return { ok: false, reason: "email-not-configured" };
}
