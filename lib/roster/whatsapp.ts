import { formatPlayerName } from "@/lib/roster/constants";
import type { PlayerListItem } from "@/lib/types/db";

export type WhatsAppEntry = {
  playerId: string;
  name: string;
  teamName: string;
  phone: string;
  inGroup: boolean;
};

export function normalizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "").trim();
}

/** Jugadores con teléfono para el flujo de WhatsApp, según categoría, equipo y pendientes. */
export function buildWhatsAppEntries(
  players: readonly PlayerListItem[],
  {
    category,
    teamId,
    onlyMissingWhatsapp,
  }: {
    category: string;
    teamId: string;
    onlyMissingWhatsapp: boolean;
  },
): WhatsAppEntry[] {
  if (!category) return [];
  const list: WhatsAppEntry[] = [];
  for (const player of players) {
    if (!player.is_active) continue;
    if (player.team?.category !== category) continue;
    if (teamId !== "all" && player.team_id !== teamId) continue;
    if (onlyMissingWhatsapp && player.in_whatsapp_group) continue;
    const phone = player.primary_phone?.trim();
    if (!phone || !normalizePhone(phone)) continue;
    list.push({
      playerId: player.id,
      name: formatPlayerName(player),
      teamName: player.team?.name ?? "Sin equipo",
      phone: phone.trim(),
      inGroup: player.in_whatsapp_group,
    });
  }
  return list.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/**
 * Marca como "en el grupo" a los jugadores indicados en una copia local de la
 * plantilla. Mantiene las referencias de los demás para no repintar de más.
 */
export function markInWhatsappGroup<T extends { id: string; in_whatsapp_group: boolean }>(
  players: readonly T[],
  playerIds: readonly string[],
): T[] {
  const ids = new Set(playerIds);
  return players.map((player) =>
    ids.has(player.id) && !player.in_whatsapp_group
      ? { ...player, in_whatsapp_group: true }
      : player,
  );
}
