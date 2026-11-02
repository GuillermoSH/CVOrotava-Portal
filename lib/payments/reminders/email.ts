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
  /** URL absoluta (o ruta en la previsualización) del logo blanco. Sin valor = solo el nombre. */
  logoUrl?: string | null;
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

const NOREPLY_NOTICE =
  "Este mensaje se ha enviado automáticamente desde una dirección que no admite respuestas, por favor no contestes a este correo. Para cualquier duda, escríbenos por WhatsApp al 616 29 88 70.";

export function renderReminderEmail({
  kind,
  playerName,
  items,
  total,
  instructions,
  clubName = "CV Orotava",
  logoUrl = null,
}: ReminderEmailInput): RenderedEmail {
  const subject = `${SUBJECT[kind]} — ${playerName}`;
  const howToLines = instructions
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const text = [
    "Hola,",
    "",
    INTRO[kind],
    "",
    `Jugador/a: ${playerName}`,
    ...items.map((i) => `- ${itemLabel(i)}: ${eur.format(i.remaining)}`),
    `Total pendiente: ${eur.format(total)}`,
    ...(howToLines.length ? ["", "Cómo pagar:", ...howToLines.map((l) => `- ${l}`)] : []),
    "",
    `Un saludo,\n${clubName}`,
    "",
    "---",
    NOREPLY_NOTICE,
  ].join("\n");

  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #E1E1E8;">${escapeHtml(itemLabel(i))}</td>` +
        `<td style="padding:10px 0;border-bottom:1px solid #E1E1E8;text-align:right;white-space:nowrap;">${eur.format(i.remaining)}</td></tr>`,
    )
    .join("");

  const logoHtml = logoUrl
    ? `<td style="width:48px;padding-right:12px;vertical-align:middle;"><img src="${escapeHtml(logoUrl)}" width="48" height="48" alt="" style="display:block;border:0;"></td>`
    : "";

  const howToHtml = howToLines.length
    ? `<div style="margin-top:24px;padding:16px 18px;background:#ECECF1;border-radius:8px;">
<p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#3F3F50;">Cómo pagar</p>
${howToLines.map((l) => `<p style="margin:0 0 8px;font-size:14px;">${escapeHtml(l)}</p>`).join("")}
</div>`
    : "";

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px 12px;background:#F0F0F4;font-family:Arial,Helvetica,sans-serif;color:#12121A;">
<div style="max-width:560px;margin:0 auto;background:#F8F8FA;border-radius:12px;overflow:hidden;">
<table role="presentation" style="width:100%;border-collapse:collapse;background:#B91C1C;"><tr><td style="padding:16px 24px;"><table role="presentation" style="border-collapse:collapse;"><tr>${logoHtml}<td style="vertical-align:middle;color:#F8F8FA;font-size:18px;font-weight:700;">${escapeHtml(clubName)}</td></tr></table></td></tr></table>
<div style="padding:24px;font-size:15px;line-height:1.55;">
<p style="margin:0 0 12px;">Hola,</p>
<p style="margin:0 0 20px;">${escapeHtml(INTRO[kind])}</p>
<p style="margin:0;font-size:13px;color:#3F3F50;">Jugador/a</p>
<p style="margin:0 0 16px;font-size:17px;font-weight:700;">${escapeHtml(playerName)}</p>
<table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px;border-top:1px solid #E1E1E8;">${rows}
<tr><td style="padding:12px 0 0;font-weight:700;font-size:16px;">Total pendiente</td><td style="padding:12px 0 0;text-align:right;font-weight:700;font-size:16px;white-space:nowrap;">${eur.format(total)}</td></tr></table>
${howToHtml}
<p style="margin:24px 0 0;">Un saludo,<br>${escapeHtml(clubName)}</p>
</div>
<div style="padding:14px 24px;background:#ECECF1;font-size:12px;line-height:1.5;color:#3F3F50;">${escapeHtml(NOREPLY_NOTICE)}</div>
</div></body></html>`;

  return { subject, html, text };
}
