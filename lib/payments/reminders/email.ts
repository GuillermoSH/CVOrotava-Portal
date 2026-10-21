import { monthName } from "@/lib/payments/fees";
import type { ReminderItem, ReminderKind } from "@/lib/payments/reminders/plan";

/** Cuerpo y asunto del aviso. Puro: lo usan el envío (servidor) y la previsualización (cliente). */

export const REMINDER_KIND_LABELS: Record<ReminderKind, string> = {
  aviso: "Aviso (día 10)",
  ultimo_aviso: "Último aviso (fin de mes)",
  atrasado: "Atrasado (cada 7 días)",
};

export type ReminderEmailInput = {
  kind: ReminderKind;
  playerName: string;
  items: readonly ReminderItem[];
  total: number;
  /** Cómo pagar (texto libre, líneas separadas por salto de línea). Vacío = sin bloque. */
  instructions: string;
  clubName?: string;
};

export type RenderedEmail = { subject: string; html: string; text: string };

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

const INTRO: Record<ReminderKind, string> = {
  aviso:
    "Te escribimos para recordarte que tenemos pendiente de cobro lo siguiente. Si todavía estás a tiempo, puedes ponerte al día con el pago.",
  ultimo_aviso:
    "Hoy es el último día del mes y seguimos sin tener registrado el pago de lo siguiente. Te agradeceremos que lo regularices cuanto antes.",
  atrasado:
    "Constan como atrasados los pagos siguientes, cuyo mes ya ha terminado. Te pedimos que los regularices lo antes posible.",
};

const SUBJECT: Record<ReminderKind, string> = {
  aviso: "Recordatorio de pago",
  ultimo_aviso: "Último día para el pago del mes",
  atrasado: "Pagos atrasados",
};

function itemLabel(item: ReminderItem): string {
  return item.month == null ? item.label : `${item.label} — ${monthName(item.month)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderReminderEmail({
  kind,
  playerName,
  items,
  total,
  instructions,
  clubName = "CV Orotava",
}: ReminderEmailInput): RenderedEmail {
  const subject = `${SUBJECT[kind]} — ${playerName}`;
  const howTo = instructions.trim();
  const closing =
    "Si ya has hecho el pago, ignora este mensaje: puede tardar un poco en reflejarse en nuestro registro.";

  const text = [
    "Hola,",
    "",
    `${INTRO[kind]}`,
    "",
    `Jugador/a: ${playerName}`,
    ...items.map((i) => `- ${itemLabel(i)}: ${eur.format(i.remaining)}`),
    `Total pendiente: ${eur.format(total)}`,
    ...(howTo ? ["", "Cómo pagar:", howTo] : []),
    "",
    closing,
    "",
    `Un saludo,\n${clubName}`,
  ].join("\n");

  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #E1E1E8;">${escapeHtml(itemLabel(i))}</td>` +
        `<td style="padding:8px 0;border-bottom:1px solid #E1E1E8;text-align:right;white-space:nowrap;">${eur.format(i.remaining)}</td></tr>`,
    )
    .join("");

  const howToHtml = howTo
    ? `<p style="margin:20px 0 6px;font-weight:600;">Cómo pagar</p><p style="margin:0;white-space:pre-line;">${escapeHtml(howTo)}</p>`
    : "";

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px 12px;background:#F0F0F4;font-family:Arial,Helvetica,sans-serif;color:#12121A;">
<div style="max-width:560px;margin:0 auto;background:#F8F8FA;border-radius:12px;overflow:hidden;">
<div style="background:#B91C1C;padding:16px 24px;color:#F8F8FA;font-size:18px;font-weight:700;">${escapeHtml(clubName)}</div>
<div style="padding:24px;font-size:15px;line-height:1.55;">
<p style="margin:0 0 12px;">Hola,</p>
<p style="margin:0 0 16px;">${escapeHtml(INTRO[kind])}</p>
<p style="margin:0 0 4px;color:#3F3F50;">Jugador/a</p>
<p style="margin:0 0 12px;font-weight:600;">${escapeHtml(playerName)}</p>
<table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px;">${rows}
<tr><td style="padding:10px 0;font-weight:700;">Total pendiente</td><td style="padding:10px 0;text-align:right;font-weight:700;white-space:nowrap;">${eur.format(total)}</td></tr></table>
${howToHtml}
<p style="margin:20px 0 0;color:#3F3F50;font-size:13px;">${escapeHtml(closing)}</p>
<p style="margin:16px 0 0;">Un saludo,<br>${escapeHtml(clubName)}</p>
</div></div></body></html>`;

  return { subject, html, text };
}
