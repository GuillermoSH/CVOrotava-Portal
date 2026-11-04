import "server-only";

import { dbErrorMessage } from "@/lib/clothing/repository/helpers";
import type { PaymentsDb } from "@/lib/payments/repository/client";
import type { ReminderConfig } from "@/lib/payments/reminders/config";

/** Estados de Resend que ya no cambian: no hace falta volver a preguntar. */
const FINAL_STATUSES = new Set(["delivered", "opened", "clicked", "bounced", "complained", "failed", "suppressed"]);

const MIN_GAP_MS = 520; // Resend admite 2 peticiones por segundo.
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Último evento de un correo según Resend (`last_event`), o null si no se pudo leer. */
async function fetchLastEvent(config: ReminderConfig, id: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.resend.com/emails/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as { last_event?: string } | null;
    return body?.last_event ?? null;
  } catch {
    return null;
  }
}

export type DeliveryRefresh = { checked: number; updated: number; remaining: number };

/**
 * Pregunta a Resend por los correos de los últimos días cuyo estado aún no es definitivo y lo
 * guarda en `delivery_status`. Respeta el límite de peticiones y un presupuesto de tiempo; lo que
 * no cabe se recoge en la siguiente pulsación.
 */
export async function refreshDeliveries(
  db: PaymentsDb,
  config: ReminderConfig,
  { sinceDays = 14, budgetMs = 40_000 }: { sinceDays?: number; budgetMs?: number } = {},
): Promise<DeliveryRefresh> {
  if (!config.apiKey) return { checked: 0, updated: 0, remaining: 0 };

  const since = new Date();
  since.setDate(since.getDate() - sinceDays);

  const { data, error } = await db
    .from("payment_reminders")
    .select("provider_id, delivery_status")
    .eq("status", "sent")
    .not("provider_id", "is", null)
    .gte("sent_on", since.toISOString().slice(0, 10));
  if (error) throw new Error(dbErrorMessage(error));

  const pending = new Map<string, string | null>();
  for (const row of data ?? []) {
    const status = (row.delivery_status as string | null) ?? null;
    if (status && FINAL_STATUSES.has(status)) continue;
    pending.set(row.provider_id as string, status);
  }

  const started = Date.now();
  let checked = 0;
  let updated = 0;
  const ids = [...pending.keys()];

  for (const id of ids) {
    if (Date.now() - started > budgetMs) break;
    const turn = Date.now();
    const event = await fetchLastEvent(config, id);
    checked += 1;
    if (event && event !== pending.get(id)) {
      const { error: updateError } = await db
        .from("payment_reminders")
        .update({ delivery_status: event, delivery_checked_at: new Date().toISOString() })
        .eq("provider_id", id);
      if (updateError) throw new Error(dbErrorMessage(updateError));
      updated += 1;
    }
    const wait = MIN_GAP_MS - (Date.now() - turn);
    if (wait > 0) await sleep(wait);
  }

  return { checked, updated, remaining: ids.length - checked };
}
