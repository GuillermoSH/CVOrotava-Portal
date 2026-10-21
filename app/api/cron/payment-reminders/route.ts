import { NextResponse } from "next/server";

import { getReminderConfig } from "@/lib/payments/reminders/config";
import { runPaymentReminders } from "@/lib/payments/reminders/run";

/**
 * Cron diario de avisos de pago (ver vercel.json). Vercel envía
 * `Authorization: Bearer $CRON_SECRET`; sin secreto configurado la ruta no responde.
 */
export async function GET(request: Request) {
  const { cronSecret } = getReminderConfig();
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const summary = await runPaymentReminders();
    return NextResponse.json(summary);
  } catch (e) {
    console.error("payment-reminders cron failed:", e);
    return NextResponse.json({ error: "Error al procesar los avisos" }, { status: 500 });
  }
}
