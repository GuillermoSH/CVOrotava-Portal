import { monthName } from "@/lib/payments/fees";
import type { ReminderItem, ReminderKind, ReminderPlan } from "@/lib/payments/reminders/plan";

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

type InstructionBlock = { title: string; lines: string[] };

/** `# Título` abre un bloque; el resto de líneas son sus puntos. Sin título = un solo bloque. */
function parseInstructions(raw: string): InstructionBlock[] {
  const blocks: InstructionBlock[] = [];
  for (const line of raw.split("\n").map((l) => l.trim())) {
    if (!line) continue;
    if (line.startsWith("# ")) {
      blocks.push({ title: line.slice(2).trim(), lines: [] });
      continue;
    }
    if (blocks.length === 0) blocks.push({ title: "", lines: [] });
    blocks[blocks.length - 1].lines.push(line);
  }
  return blocks;
}

const NOREPLY_NOTICE =
  "Este mensaje se ha enviado automáticamente desde una dirección que no admite respuestas, por favor no contestes a este correo. Para cualquier duda, escríbenos por WhatsApp al 696 94 28 23.";

export type ReminderEmailPlayer = {
  playerName: string;
  items: readonly ReminderItem[];
  total: number;
};

export type CombinedReminderEmailInput = {
  /** Tono del correo: el del aviso más grave de los jugadores. */
  kind: ReminderKind;
  /** Hay avisos de tipos distintos entre los jugadores: la introducción no puede hablar de todos como atrasados. */
  mixed?: boolean;
  players: readonly ReminderEmailPlayer[];
  instructions: string;
  clubName?: string;
  logoUrl?: string | null;
};

const INTRO_MIXED =
  "Te escribimos para recordarte los pagos pendientes de la temporada. Te pedimos que los regularices lo antes posible.";

/** «Ana», «Ana y Luis», «Ana, Luis y Marta». */
export function formatPlayerNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

/**
 * Un correo para un destino: uno o varios jugadores (hermanos con los mismos tutores), cada uno con
 * sus conceptos y, si son varios, un subtotal y un total común.
 */
export function renderCombinedReminderEmail({
  kind,
  mixed = false,
  players,
  instructions,
  clubName = "C.V. Orotava - Puerto de la Cruz",
  logoUrl = null,
}: CombinedReminderEmailInput): RenderedEmail {
  const multi = players.length > 1;
  const intro = mixed ? INTRO_MIXED : INTRO[kind];
  const grandTotal = Math.round(players.reduce((acc, p) => acc + p.total, 0) * 100) / 100;
  const subject = `${SUBJECT[kind]} — ${formatPlayerNames(players.map((p) => p.playerName))}`;
  const sections = parseInstructions(instructions);

  const textPlayers = players.flatMap((p, i) => [
    ...(i > 0 ? [""] : []),
    `Jugador/a: ${p.playerName}`,
    ...p.items.map((it) => `- ${itemLabel(it)}: ${eur.format(it.remaining)}`),
    ...(multi ? [`Subtotal: ${eur.format(p.total)}`] : []),
  ]);

  const text = [
    "Hola,",
    "",
    intro,
    "",
    ...textPlayers,
    "",
    `Total pendiente: ${eur.format(grandTotal)}`,
    ...(sections.length
      ? [
          "",
          "CÓMO PAGAR",
          ...sections.flatMap((sec) => [
            "",
            ...(sec.title ? [`${sec.title}:`] : []),
            ...sec.lines.map((l) => (l.startsWith("! ") ? `- ¡IMPORTANTE! ${l.slice(2)}` : `- ${l}`)),
          ]),
        ]
      : []),
    "",
    `Saludos cordiales,
${clubName}`,
    "",
    "---",
    NOREPLY_NOTICE,
  ].join("\n");

  const playerBlocks = players
    .map((p, i) => {
      const rows = p.items
        .map(
          (it) =>
            `<tr><td style="padding:10px 0;border-bottom:1px solid #E1E1E8;">${escapeHtml(itemLabel(it))}</td>` +
            `<td style="padding:10px 0;border-bottom:1px solid #E1E1E8;text-align:right;white-space:nowrap;">${eur.format(it.remaining)}</td></tr>`,
        )
        .join("");
      const subtotal = multi
        ? `<tr><td style="padding:10px 0 0;color:#3F3F50;">Subtotal</td><td style="padding:10px 0 0;text-align:right;white-space:nowrap;color:#3F3F50;">${eur.format(p.total)}</td></tr>`
        : "";
      return `<p style="margin:${i > 0 ? "24px" : "0"} 0 0;font-size:13px;color:#3F3F50;">Jugador/a</p>
<p style="margin:0 0 12px;font-size:17px;font-weight:700;">${escapeHtml(p.playerName)}</p>
<table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px;border-top:1px solid #E1E1E8;">${rows}${subtotal}</table>`;
    })
    .join("\n");

  const logoHtml = logoUrl
    ? `<td style="width:48px;padding-right:12px;vertical-align:middle;"><img src="${escapeHtml(logoUrl)}" width="48" height="48" alt="" style="display:block;border:0;"></td>`
    : "";

  const howToHtml = sections.length
    ? `<p style="margin:28px 0 10px;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#3F3F50;">Cómo pagar</p>
${sections
  .map(
    (sec) => `<div style="margin:0 0 12px;padding:14px 16px;background:#ECECF1;border-left:4px solid #B91C1C;border-radius:6px;">
${sec.title ? `<p style="margin:0 0 6px;font-size:15px;font-weight:700;">${escapeHtml(sec.title)}</p>` : ""}${sec.lines.map(instructionLineHtml).join("")}
</div>`,
  )
  .join("\n")}`
    : "";

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px 12px;background:#F0F0F4;font-family:Arial,Helvetica,sans-serif;color:#12121A;">
<div style="max-width:560px;margin:0 auto;background:#F8F8FA;border-radius:12px;overflow:hidden;">
<table role="presentation" style="width:100%;border-collapse:collapse;background:#12121A;"><tr><td style="padding:16px 24px;"><table role="presentation" style="border-collapse:collapse;"><tr>${logoHtml}<td style="vertical-align:middle;color:#F8F8FA;font-size:18px;font-weight:700;">${escapeHtml(clubName)}</td></tr></table></td></tr></table>
<div style="padding:24px;font-size:15px;line-height:1.55;">
<p style="margin:0 0 12px;">Hola,</p>
<p style="margin:0 0 20px;">${escapeHtml(intro)}</p>
${playerBlocks}
<table role="presentation" style="width:100%;border-collapse:collapse;font-size:16px;margin-top:${multi ? "20px" : "0"};"><tr><td style="padding:12px 0 0;font-weight:700;">Total pendiente</td><td style="padding:12px 0 0;text-align:right;font-weight:700;white-space:nowrap;">${eur.format(grandTotal)}</td></tr></table>
${howToHtml}
<p style="margin:24px 0 0;">Saludos cordiales,<br>${escapeHtml(clubName)}</p>
</div>
<div style="padding:14px 24px;background:#ECECF1;font-size:12px;line-height:1.5;color:#3F3F50;">${escapeHtml(NOREPLY_NOTICE)}</div>
</div></body></html>`;

  return { subject, html, text };
}

/** Correo de un grupo de jugadores con el mismo destino: lo comparten el envío real, la prueba y la vista previa. */
export function renderReminderGroupEmail(
  group: { kind: ReminderKind; plans: readonly ReminderPlan[] },
  options: { instructions: string; clubName?: string; logoUrl?: string | null },
): RenderedEmail {
  return renderCombinedReminderEmail({
    kind: group.kind,
    mixed: new Set(group.plans.map((p) => p.kind)).size > 1,
    players: group.plans.map((p) => ({ playerName: p.playerName, items: p.items, total: p.total })),
    ...options,
  });
}

/** Correo de un solo jugador (previsualización y envío de prueba). */
export function renderReminderEmail({
  kind,
  playerName,
  items,
  total,
  instructions,
  clubName,
  logoUrl,
}: ReminderEmailInput): RenderedEmail {
  return renderCombinedReminderEmail({
    kind,
    players: [{ playerName, items, total }],
    instructions,
    clubName,
    logoUrl,
  });
}

const LABELED_LINE = /^(IBAN|Titular|Concepto):\s*(.*)$/;

/** `! texto` = aviso destacado con icono. `IBAN:`/`Titular:`/`Concepto:` van subrayados. */
function instructionLineHtml(line: string): string {
  if (line.startsWith("! ")) {
    return `<p style="margin:8px 0 6px;padding:10px 12px;background:#FDF3D7;border-radius:6px;font-size:14px;font-weight:600;color:#12121A;">&#9888;&#65039; ${escapeHtml(line.slice(2))}</p>`;
  }
  const match = LABELED_LINE.exec(line);
  if (match) {
    return `<p style="margin:0 0 6px;font-size:14px;"><span style="text-decoration:underline;font-weight:700;">${escapeHtml(match[1])}:</span> ${escapeHtml(match[2])}</p>`;
  }
  return `<p style="margin:0 0 6px;font-size:14px;">${escapeHtml(line)}</p>`;
}
