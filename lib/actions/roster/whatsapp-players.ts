"use server";

import { requireRosterReadAccess } from "@/lib/roster/auth";
import { getRosterDb } from "@/lib/roster/repository/client";
import { listPlayersWithPrimaryPhone } from "@/lib/roster/repository/players";
import { getCurrentSeason } from "@/lib/season";
import type { PlayerListItem } from "@/lib/types/db";

export type ListWhatsAppPlayersResult =
  | { ok: true; players: PlayerListItem[] }
  | { ok: false; error: string };

export async function listWhatsAppPlayersAction(): Promise<ListWhatsAppPlayersResult> {
  try {
    await requireRosterReadAccess();
    const db = await getRosterDb();
    const players = await listPlayersWithPrimaryPhone(db, getCurrentSeason());
    return { ok: true, players };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar los jugadores";
    return { ok: false, error: message };
  }
}
