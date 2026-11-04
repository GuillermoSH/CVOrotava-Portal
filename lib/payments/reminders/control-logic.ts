import { LATE_REPEAT_DAYS, type ReminderKind } from "@/lib/payments/reminders/plan";

/** Lógica pura de la página de control: cuándo toca el siguiente aviso y cómo se agrupa el registro. */

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parse(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export type NextReminder = { kind: ReminderKind; on: string };

/**
 * Cuándo toca el siguiente aviso a un deudor, con las mismas reglas que `planReminders`:
 *  - con algo atrasado: «atrasado» a los 7 días del último (o ya, si nunca se avisó);
 *  - si no: «aviso» desde el día 10 (si aún no se avisó este mes) y «último aviso» el último día.
 * Una fecha igual o anterior a hoy significa «en el próximo pase».
 */
export function nextReminder({
  today,
  hasLate,
  lastLateSent,
  avisoSentThisMonth,
}: {
  today: Date;
  hasLate: boolean;
  /** YYYY-MM-DD del último «atrasado» enviado. */
  lastLateSent: string | null;
  avisoSentThisMonth: boolean;
}): NextReminder {
  const todayKey = dateKey(today);

  if (hasLate) {
    if (!lastLateSent) return { kind: "atrasado", on: todayKey };
    const next = parse(lastLateSent);
    next.setDate(next.getDate() + LATE_REPEAT_DAYS);
    const on = dateKey(next);
    return { kind: "atrasado", on: on < todayKey ? todayKey : on };
  }

  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  if (avisoSentThisMonth) return { kind: "ultimo_aviso", on: dateKey(lastDay) };
  if (today.getDate() >= 10) return { kind: "aviso", on: todayKey };
  return { kind: "aviso", on: dateKey(new Date(today.getFullYear(), today.getMonth(), 10)) };
}

export type LogRow = {
  id: string;
  player_id: string;
  player_name: string;
  kind: ReminderKind;
  sent_on: string;
  recipients: string[];
  total: number;
  status: "sent" | "failed";
  provider_id: string | null;
  error: string | null;
  delivery_status: string | null;
  created_at: string;
};

export type LoggedEmail = {
  key: string;
  sentOn: string;
  createdAt: string;
  status: "sent" | "failed";
  recipients: string[];
  players: string[];
  kinds: ReminderKind[];
  total: number;
  deliveryStatus: string | null;
  error: string | null;
};

/**
 * Un correo combinado deja una fila por jugador con el mismo `provider_id`: en el registro se
 * muestran como un solo envío. Los fallos (sin id) se agrupan por día y destino.
 */
export function groupLogByEmail(rows: readonly LogRow[]): LoggedEmail[] {
  const byKey = new Map<string, LoggedEmail>();
  for (const row of rows) {
    const key = row.provider_id ?? `${row.status}:${row.sent_on}:${[...row.recipients].sort().join(",")}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.players.push(row.player_name);
      if (!existing.kinds.includes(row.kind)) existing.kinds.push(row.kind);
      existing.total += Number(row.total);
      continue;
    }
    byKey.set(key, {
      key,
      sentOn: row.sent_on,
      createdAt: row.created_at,
      status: row.status,
      recipients: row.recipients,
      players: [row.player_name],
      kinds: [row.kind],
      total: Number(row.total),
      deliveryStatus: row.delivery_status,
      error: row.error,
    });
  }
  return [...byKey.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type DeliveryTone = "ok" | "bad" | "pending";

/** Texto y tono de un estado de entrega de Resend. */
export function describeDelivery(status: string | null): { label: string; tone: DeliveryTone } {
  switch (status) {
    case "delivered":
    case "opened":
    case "clicked":
      return { label: status === "delivered" ? "Entregado" : "Entregado y abierto", tone: "ok" };
    case "bounced":
      return { label: "Rebotado", tone: "bad" };
    case "complained":
      return { label: "Marcado como spam", tone: "bad" };
    case "failed":
      return { label: "Fallo de entrega", tone: "bad" };
    case "suppressed":
      return { label: "Bloqueado por Resend", tone: "bad" };
    case "delivery_delayed":
      return { label: "Retrasado", tone: "pending" };
    case null:
      return { label: "Sin comprobar", tone: "pending" };
    default:
      return { label: "Enviado", tone: "pending" };
  }
}
