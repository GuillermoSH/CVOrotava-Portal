import "server-only";

import { dbErrorMessage } from "@/lib/clothing/repository/helpers";
import type { PaymentsDb } from "@/lib/payments/repository/client";
import type { ReminderHistoryEntry, ReminderItem, ReminderKind } from "@/lib/payments/reminders/plan";

/** Email del contacto principal de cada jugador (una sola dirección por jugador). */
export async function listContactEmails(
  db: PaymentsDb,
  playerIds: readonly string[],
): Promise<Map<string, string[]>> {
  const byPlayer = new Map<string, string[]>();
  if (playerIds.length === 0) return byPlayer;

  const { data, error } = await db
    .from("player_contacts")
    .select("player_id, email, is_primary")
    .in("player_id", [...playerIds])
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(dbErrorMessage(error));

  // Solo el contacto principal (el primero de cada jugador por el orden de la consulta).
  // Si el principal no tiene correo válido, no se cae al de otro contacto: se avisa en control.
  for (const row of data ?? []) {
    const playerId = row.player_id as string;
    if (byPlayer.has(playerId)) continue;
    const email = String(row.email ?? "").trim().toLowerCase();
    byPlayer.set(playerId, email.includes("@") ? [email] : []);
  }
  return byPlayer;
}

/** Avisos enviados desde `since` (YYYY-MM-DD): base de la cadencia y del antirrepetido. */
export async function listReminderHistory(
  db: PaymentsDb,
  since: string,
): Promise<ReminderHistoryEntry[]> {
  const { data, error } = await db
    .from("payment_reminders")
    .select("player_id, kind, sent_on")
    .eq("status", "sent")
    .gte("sent_on", since);

  if (error) throw new Error(dbErrorMessage(error));
  return (data ?? []) as ReminderHistoryEntry[];
}

export async function logReminder(
  db: PaymentsDb,
  input: {
    player_id: string;
    kind: ReminderKind;
    sent_on: string;
    recipients: string[];
    items: ReminderItem[];
    total: number;
    status: "sent" | "failed";
    provider_id?: string | null;
    error?: string | null;
  },
): Promise<void> {
  const { error } = await db.from("payment_reminders").insert({
    ...input,
    provider_id: input.provider_id ?? null,
    error: input.error ?? null,
  });
  if (error) throw new Error(dbErrorMessage(error));
}

/**
 * Correos que suman las filas del registro de un día. Resend cuenta uno por destinatario y un
 * correo combinado (varios jugadores, mismo destino) deja una fila por jugador con el mismo
 * `provider_id`: se cuenta una sola vez. Las filas sin id del proveedor cuentan cada una.
 */
export function countEmailsFromRows(
  rows: readonly { recipients: unknown; provider_id: string | null }[],
): number {
  const byEmail = new Map<string, number>();
  let loose = 0;
  for (const row of rows) {
    const n = Array.isArray(row.recipients) ? row.recipients.length : 0;
    if (row.provider_id) byEmail.set(row.provider_id, n);
    else loose += n;
  }
  return loose + [...byEmail.values()].reduce((acc, n) => acc + n, 0);
}

/** Correos de avisos ya enviados en un día (YYYY-MM-DD), contados como los cuenta el proveedor. */
export async function countEmailsSentOn(db: PaymentsDb, date: string): Promise<number> {
  const { data, error } = await db
    .from("payment_reminders")
    .select("recipients, provider_id")
    .eq("status", "sent")
    .eq("sent_on", date);

  if (error) throw new Error(dbErrorMessage(error));
  return countEmailsFromRows((data ?? []) as { recipients: unknown; provider_id: string | null }[]);
}
