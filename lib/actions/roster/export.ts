"use server";

import { getPaymentsDb } from "@/lib/payments/repository/client";
import { listPlayerIdsWithPaidMatricula } from "@/lib/payments/repository/payments";
import { requireRosterWriteAccess } from "@/lib/roster/auth";
import {
  buildPlayersCsv,
  PLAYER_EXPORT_MAX_ROWS,
  playerExportFilename,
  resolvePlayerExportFields,
  type PlayerExportScope,
} from "@/lib/roster/player-export";
import type { PlayerFilterState } from "@/lib/roster/player-filters";
import { playerFilterStateToListFilters } from "@/lib/roster/player-filters";
import { getRosterDb } from "@/lib/roster/repository/client";
import {
  listPlayersPage,
  listPlayersWithDetailsByIds,
} from "@/lib/roster/repository/players";
import { getCurrentSeason } from "@/lib/season";

export type ExportPlayersCsvInput = {
  scope: PlayerExportScope;
  fieldIds: string[];
  playerIds?: string[];
  filters?: PlayerFilterState;
};

export type ExportPlayersCsvResult =
  | { ok: true; filename: string; base64: string; count: number }
  | { ok: false; error: string };

export async function exportPlayersCsvAction(
  input: ExportPlayersCsvInput,
): Promise<ExportPlayersCsvResult> {
  try {
    await requireRosterWriteAccess();

    const fields = resolvePlayerExportFields(input.fieldIds);
    if (fields.length === 0) {
      return { ok: false, error: "Elige al menos un campo para exportar" };
    }

    const season = getCurrentSeason();
    const db = await getRosterDb();

    let ids: string[] = [];

    if (input.scope === "selected") {
      ids = [...new Set((input.playerIds ?? []).filter(Boolean))];
      if (ids.length === 0) {
        return { ok: false, error: "Selecciona al menos un jugador" };
      }
    } else if (input.scope === "filtered") {
      const filters = playerFilterStateToListFilters(
        input.filters ?? { query: "", facets: [], statusFilter: "active" },
      );
      const needsMatricula = filters.checklist === "missing_matricula";
      const matriculaPaidPlayerIds = needsMatricula
        ? new Set(await listPlayerIdsWithPaidMatricula(await getPaymentsDb(), season))
        : undefined;
      const page = await listPlayersPage(db, {
        season,
        page: 1,
        pageSize: 0,
        sortDir: "asc",
        filters,
        context: { matriculaPaidPlayerIds },
      });
      ids = page.players.map((player) => player.id);
      if (ids.length === 0) {
        return { ok: false, error: "Ningún jugador coincide con los filtros actuales" };
      }
    } else {
      const page = await listPlayersPage(db, {
        season,
        page: 1,
        pageSize: 0,
        sortDir: "asc",
        filters: { statusFilter: "all" },
      });
      ids = page.players.map((player) => player.id);
      if (ids.length === 0) {
        return { ok: false, error: "No hay jugadores en esta temporada" };
      }
    }

    if (ids.length > PLAYER_EXPORT_MAX_ROWS) {
      return {
        ok: false,
        error: `Demasiados jugadores para exportar (máx. ${PLAYER_EXPORT_MAX_ROWS})`,
      };
    }

    const players = await listPlayersWithDetailsByIds(db, ids, season);
    if (players.length === 0) {
      return { ok: false, error: "No se encontraron jugadores para exportar" };
    }

    const csv = buildPlayersCsv(players, fields.map((field) => field.id));
    return {
      ok: true,
      filename: playerExportFilename(season),
      base64: Buffer.from(csv, "utf8").toString("base64"),
      count: players.length,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo exportar el CSV",
    };
  }
}
