import "server-only";

import { dbErrorMessage } from "@/lib/clothing/repository/helpers";
import type { PaymentsDb } from "@/lib/payments/repository/client";
import type { ReminderHistoryEntry, ReminderItem, ReminderKind } from "@/lib/payments/reminders/plan";

/** Emails de los contactos de cada jugador, el principal primero, sin duplicados. */
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
    .not("email", "is", null)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(dbErrorMessage(error));

  for (const row of data ?? []) {
    const email = String(row.email ?? "").trim().toLowerCase();
    if (!email.includes("@")) continue;
    const list = byPlayer.get(row.player_id as string) ?? [];
    if (!list.includes(email)) list.push(email);
    byPlayer.set(row.player_id as string, list);
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
