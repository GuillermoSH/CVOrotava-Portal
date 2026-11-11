import { monthName } from "@/lib/payments/fees";
import type { ReminderItem, ReminderKind, ReminderPlan } from "@/lib/payments/reminders/plan";

/** Cuerpo y asunto del aviso. Puro: lo usan el envío (servidor) y la previsualización (cliente). */

export const REMINDER_KIND_LABELS: Record<ReminderKind, string> = {
  aviso: "Recordatorio (día 10)",
  ultimo_aviso: "Aviso (último día del mes)",
  atrasado: "Atrasado (cada 7 días)",
};

/**
 * Aspecto de cada tipo en el correo: franja de color con su etiqueta y titular, para que se
 * distinga de un vistazo (azul = recordatorio, ámbar = aviso, rojo del club = atrasado).
 * Colores con contraste suficiente sobre texto blanco.
 */
const KIND_STYLE: Record<
  ReminderKind,
  { strong: string; soft: string; badge: string; headline: string }
> = {
  aviso: {
    strong: "#1E5FA8",
    soft: "#E3EDF8",
    badge: "Recordatorio · día 10",
    headline: "Tienes pagos pendientes",
  },
  ultimo_aviso: {
    strong: "#B45309",
    soft: "#FBEBD3",
    badge: "Aviso · cierre de mes",
    headline: "Hoy cierra el mes y siguen pendientes tus pagos",
  },
  atrasado: {
    strong: "#B91C1C",
    soft: "#FBE4E4",
    badge: "Aviso · pago atrasado",
    headline: "Tienes pagos atrasados",
  },
};

const LATE_COLOR = "#B91C1C";
const DUE_COLOR = "#B45309";

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
    "Constan como atrasados los pagos siguientes, cuyo mes ya ha terminado. Te pedimos que los regularices lo antes posible. Te volveremos a avisar cada semana hasta que se regularice.",
};

const SUBJECT: Record<ReminderKind, string> = {
  aviso: "Recordatorio de pago",
  ultimo_aviso: "Aviso: pagos pendientes al cierre del mes",
  atrasado: "Aviso: pagos atrasados",
};

/** Atrasado (mes terminado) y vencido (aún en plazo hasta fin de mes), por separado. */
function splitByLate(items: readonly ReminderItem[]): { late: ReminderItem[]; due: ReminderItem[] } {
  return {
    late: items.filter((i) => i.late === true),
    due: items.filter((i) => i.late !== true),
  };
}

function sumRemaining(items: readonly ReminderItem[]): number {
  return Math.round(items.reduce((acc, i) => acc + i.remaining, 0) * 100) / 100;
}

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

const HELP_NOTICE =
  "¿Tienes algún problema con el pago o con tu situación económica? Consúltalo con nosotros llamando o escribiendo al 696 94 28 23.";

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

  const style = KIND_STYLE[kind];

  const textPlayers = players.flatMap((p, i) => {
    const { late, due } = splitByLate(p.items);
    const grouped = late.length > 0 && due.length > 0;
    const lines = (items: readonly ReminderItem[]) =>
      items.map((it) => `- ${itemLabel(it)}: ${eur.format(it.remaining)}`);
    return [
      ...(i > 0 ? [""] : []),
      `Jugador/a: ${p.playerName}`,
      ...(grouped
        ? [
            "ATRASADO (mes ya terminado):",
            ...lines(late),
            `Subtotal atrasado: ${eur.format(sumRemaining(late))}`,
            "",
            "VENCIDO (plazo hasta fin de mes):",
            ...lines(due),
            `Subtotal vencido: ${eur.format(sumRemaining(due))}`,
          ]
        : lines(p.items)),
      ...(multi ? [`Subtotal: ${eur.format(p.total)}`] : []),
    ];
  });

  const text = [
    style.badge.toUpperCase(),
    style.headline,
    "",
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
    HELP_NOTICE,
    "",
    `Saludos cordiales,
${clubName}`,
    "",
    "---",
    NOREPLY_NOTICE,
  ].join("\n");

  const itemRowsHtml = (items: readonly ReminderItem[]) =>
    items
      .map(
        (it) =>
          `<tr><td style="padding:10px 0;border-bottom:1px solid #E1E1E8;font-size:15px;">${escapeHtml(itemLabel(it))}</td>` +
          `<td style="padding:10px 0 10px 12px;border-bottom:1px solid #E1E1E8;text-align:right;white-space:nowrap;font-size:15px;">${eur.format(it.remaining)}</td></tr>`,
      )
      .join("");

  /** Cabecera de un bloque dentro de un jugador (atrasado / vencido), con su color. */
  const groupHeadingHtml = (label: string, color: string, subtotal: number) =>
    `<tr><td style="padding:16px 0 4px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${color};border-bottom:2px solid ${color};">${label}</td>` +
    `<td style="padding:16px 0 4px 12px;text-align:right;white-space:nowrap;font-size:13px;font-weight:700;color:${color};border-bottom:2px solid ${color};">${eur.format(subtotal)}</td></tr>`;

  const playerBlocks = players
    .map((p, i) => {
      const { late, due } = splitByLate(p.items);
      const grouped = late.length > 0 && due.length > 0;
      const rows = grouped
        ? groupHeadingHtml("Atrasado · mes ya terminado", LATE_COLOR, sumRemaining(late)) +
          itemRowsHtml(late) +
          groupHeadingHtml("Vencido · plazo hasta fin de mes", DUE_COLOR, sumRemaining(due)) +
          itemRowsHtml(due)
        : itemRowsHtml(p.items);
      const subtotal = multi
        ? `<tr><td style="padding:10px 0 0;font-size:14px;color:#3F3F50;">Subtotal</td><td style="padding:10px 0 0 12px;text-align:right;white-space:nowrap;font-size:14px;color:#3F3F50;">${eur.format(p.total)}</td></tr>`
        : "";
      return `<p style="margin:${i > 0 ? "28px" : "0"} 0 2px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5A5A6B;">Jugador/a</p>
<p class="player" style="margin:0 0 12px;font-size:20px;line-height:1.3;font-weight:700;">${escapeHtml(p.playerName)}</p>
<table role="presentation" width="100%" style="width:100%;border-collapse:collapse;${grouped ? "" : "border-top:1px solid #E1E1E8;"}">${rows}${subtotal}</table>`;
    })
    .join("\n");

  const bannerHtml = `<table role="presentation" width="100%" style="width:100%;border-collapse:collapse;background:${style.strong};"><tr><td class="banner" style="padding:20px 24px;">
<p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#FFFFFF;">${escapeHtml(style.badge)}</p>
<p class="headline" style="margin:0;font-size:24px;line-height:1.25;font-weight:700;color:#FFFFFF;">${escapeHtml(style.headline)}</p>
</td></tr></table>`;

  const logoHtml = logoUrl
    ? `<td style="width:44px;padding-right:12px;vertical-align:middle;"><img src="${escapeHtml(logoUrl)}" width="44" height="44" alt="" style="display:block;border:0;width:44px;height:44px;"></td>`
    : "";

  const howToHtml = sections.length
    ? `<p style="margin:32px 0 12px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5A5A6B;">Cómo pagar</p>
${sections
  .map(
    (sec) => `<div class="card" style="margin:0 0 12px;padding:16px 18px;background:#FFFFFF;border:1px solid #DADAE3;border-radius:10px;">
${sec.title ? `<p style="margin:0 0 10px;font-size:16px;line-height:1.3;font-weight:700;">${escapeHtml(sec.title)}</p>` : ""}${sec.lines.map(instructionLineHtml).join("")}
</div>`,
  )
  .join("\n")}`
    : "";

  const helpHtml = `<p class="help" style="margin:20px 0 0;padding:14px 16px;background:#ECECF1;border-radius:10px;font-size:14px;line-height:1.5;color:#2B2B38;">${escapeHtml(HELP_NOTICE)}</p>`;

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><style>
@media only screen and (max-width:480px){
  .outer{padding:0 !important}
  .wrap{border-radius:0 !important}
  .head{padding:14px 16px !important}
  .banner{padding:16px !important}
  .headline{font-size:21px !important}
  .body{padding:20px 16px !important;font-size:16px !important}
  .player{font-size:19px !important}
  .card{padding:14px !important}
  .foot{padding:14px 16px !important}
}
</style></head><body style="margin:0;padding:0;background:#F0F0F4;font-family:Arial,Helvetica,sans-serif;color:#12121A;">
<div class="outer" style="padding:24px 12px;">
<div class="wrap" style="max-width:560px;margin:0 auto;background:#F8F8FA;border-radius:12px;overflow:hidden;">
<table role="presentation" width="100%" style="width:100%;border-collapse:collapse;background:#12121A;"><tr><td class="head" style="padding:16px 24px;"><table role="presentation" style="border-collapse:collapse;"><tr>${logoHtml}<td style="vertical-align:middle;color:#F8F8FA;font-size:17px;line-height:1.3;font-weight:700;">${escapeHtml(clubName)}</td></tr></table></td></tr></table>
${bannerHtml}
<div class="body" style="padding:28px 24px;font-size:15px;line-height:1.55;">
<p style="margin:0 0 8px;font-size:18px;font-weight:700;">Hola,</p>
<p style="margin:0 0 24px;color:#2B2B38;">${escapeHtml(intro)}</p>
${playerBlocks}
<table role="presentation" width="100%" style="width:100%;border-collapse:collapse;margin-top:20px;background:${style.soft};border-left:4px solid ${style.strong};"><tr><td style="padding:14px 16px;font-size:17px;font-weight:700;">Total pendiente</td><td style="padding:14px 16px 14px 12px;text-align:right;font-size:22px;font-weight:700;white-space:nowrap;color:${style.strong};">${eur.format(grandTotal)}</td></tr></table>
${howToHtml}
${helpHtml}
<p style="margin:28px 0 0;color:#2B2B38;">Saludos cordiales,<br><strong>${escapeHtml(clubName)}</strong></p>
</div>
<div class="foot" style="padding:14px 24px;background:#ECECF1;font-size:12px;line-height:1.5;color:#5A5A6B;">${escapeHtml(NOREPLY_NOTICE)}</div>
</div></div></body></html>`;

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

/** `! texto` = aviso destacado con icono. `IBAN:`/`Titular:`/`Concepto:` llevan la etiqueta en gris y el dato en negrita. */
function instructionLineHtml(line: string): string {
  if (line.startsWith("! ")) {
    return `<p style="margin:12px 0 0;padding:10px 12px;background:#FDF3D7;border-radius:8px;font-size:14px;line-height:1.45;font-weight:600;color:#12121A;">&#9888;&#65039; ${escapeHtml(line.slice(2))}</p>`;
  }
  const match = LABELED_LINE.exec(line);
  if (match) {
    return `<p style="margin:0 0 8px;font-size:14px;line-height:1.45;"><span style="display:block;font-size:12px;color:#5A5A6B;">${escapeHtml(match[1])}</span><span style="font-size:15px;font-weight:700;">${escapeHtml(match[2])}</span></p>`;
  }
  return `<p style="margin:0;font-size:14px;line-height:1.5;color:#2B2B38;">${escapeHtml(line)}</p>`;
}
