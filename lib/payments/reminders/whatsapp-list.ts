import { monthName } from "@/lib/payments/fees";
import type { OwingItem, OwingPlayer } from "@/lib/payments/reminders/plan";

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/** `Cuota mensual (octubre, noviembre)` / `Matrícula`: los meses de una misma línea se agrupan. */
function describeItems(items: readonly OwingItem[]): string {
  const groups = new Map<string, string[]>();
  for (const item of items) {
    const months = groups.get(item.label) ?? [];
    if (item.month != null) months.push(monthName(item.month));
    groups.set(item.label, months);
  }
  return [...groups.entries()]
    .map(([label, months]) => (months.length ? `${label} (${months.join(", ")})` : label))
    .join(", ");
}

function formatDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Lista de pendientes lista para pegar en WhatsApp (`*negrita*`), agrupada por equipo.
 * `onlyLate` deja solo lo atrasado (mes ya terminado).
 */
export function formatOwingForWhatsapp({
  owing,
  date,
  onlyLate,
}: {
  owing: readonly OwingPlayer[];
  /** YYYY-MM-DD */
  date: string;
  onlyLate: boolean;
}): string {
  const players = owing
    .map((p) => {
      const items = onlyLate ? p.items.filter((i) => i.late) : p.items;
      return { ...p, items, total: roundCents(items.reduce((acc, i) => acc + i.remaining, 0)) };
    })
    .filter((p) => p.items.length > 0);

  if (players.length === 0) return "";

  const byTeam = new Map<string, typeof players>();
  for (const p of players) {
    const team = p.teamName ?? "Sin equipo";
    byTeam.set(team, [...(byTeam.get(team) ?? []), p]);
  }

  const lines = [`*Pagos pendientes — ${formatDate(date)}*`];
  for (const [team, list] of [...byTeam.entries()].sort(([a], [b]) => a.localeCompare(b, "es"))) {
    lines.push("", `*${team}*`);
    for (const p of [...list].sort((a, b) => a.playerName.localeCompare(b.playerName, "es"))) {
      lines.push(`• ${p.playerName} — ${describeItems(p.items)} · ${eur.format(p.total)}`);
    }
  }

  const grand = roundCents(players.reduce((acc, p) => acc + p.total, 0));
  lines.push("", `${players.length} jugadores · Total ${eur.format(grand)}`);
  return lines.join("\n");
}
