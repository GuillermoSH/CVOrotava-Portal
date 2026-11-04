import { NextResponse } from "next/server";

import {
  deliveryStatusFromEvent,
  shouldReplaceStatus,
  verifySvixSignature,
} from "@/lib/payments/reminders/webhook";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Webhook de Resend: guarda en `payment_reminders.delivery_status` lo que le pasa a cada aviso
 * (entregado, rebotado, spam…). Se configura en el panel de Resend → Webhooks con la URL
 * `https://<dominio>/api/webhooks/resend` y los eventos email.*; el secreto `whsec_…` va en
 * RESEND_WEBHOOK_SECRET. Sin secreto la ruta no responde.
 */
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "No configurado" }, { status: 503 });

  // La firma se calcula sobre el cuerpo tal cual llega: se lee como texto antes de parsear.
  const body = await request.text();
  const valid = verifySvixSignature({
    secret,
    id: request.headers.get("svix-id"),
    timestamp: request.headers.get("svix-timestamp"),
    signature: request.headers.get("svix-signature"),
    body,
  });
  if (!valid) return NextResponse.json({ error: "Firma no válida" }, { status: 401 });

  let event: { type?: string; data?: { email_id?: string } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Cuerpo no válido" }, { status: 400 });
  }

  const status = deliveryStatusFromEvent(event.type ?? "");
  const emailId = event.data?.email_id;
  // Eventos que no usamos (o de correos que no son avisos): se confirman y se ignoran.
  if (!status || !emailId) return NextResponse.json({ ok: true, ignored: true });

  try {
    const db = createServiceRoleClient();
    const { data, error } = await db
      .from("payment_reminders")
      .select("delivery_status")
      .eq("provider_id", emailId)
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) return NextResponse.json({ ok: true, ignored: true });

    if (shouldReplaceStatus((data[0].delivery_status as string | null) ?? null, status)) {
      const { error: updateError } = await db
        .from("payment_reminders")
        .update({ delivery_status: status, delivery_checked_at: new Date().toISOString() })
        .eq("provider_id", emailId);
      if (updateError) throw updateError;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("resend webhook failed:", e);
    // 500 para que Resend reintente el envío del evento.
    return NextResponse.json({ error: "Error al guardar el evento" }, { status: 500 });
  }
}
