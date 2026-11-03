import { NextResponse } from "next/server";

import { getReminderConfig } from "@/lib/payments/reminders/config";
import { runPaymentReminders } from "@/lib/payments/reminders/run";

/**
 * Cron diario de avisos de pago. Lo llama el planificador (Supabase pg_cron, ver la migración
 * payment_reminders_cron) con `Authorization: Bearer $CRON_SECRET`; sin secreto configurado la
 * ruta no responde.
 *
 * Para probarlo a mano: `?dryRun=1` solo cuenta los avisos de hoy (no envía ni registra nada) y
 * `?limit=1` envía como mucho un aviso (a PAYMENT_REMINDERS_TEST_TO si está definida).
 */
/** Los correos salen uno a uno: margen para listas largas (Vercel admite hasta 60 s en Hobby). */
export const maxDuration = 60;

export async function GET(request: Request) {
  const { cronSecret } = getReminderConfig();
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const params = new URL(request.url).searchParams;
    const limitParam = params.get("limit");
    const limit = limitParam != null && /^[0-9]+$/.test(limitParam) ? Number(limitParam) : undefined;
    const summary = await runPaymentReminders(new Date(), {
      dryRun: params.get("dryRun") === "1",
      limit,
    });
    return NextResponse.json(summary);
  } catch (e) {
    console.error("payment-reminders cron failed:", e);
    return NextResponse.json({ error: "Error al procesar los avisos" }, { status: 500 });
  }
}
