"use server";

import { revalidatePath } from "next/cache";

import { requireRosterWriteAccess } from "@/lib/roster/auth";
import { parsePlayerImportFile, playerImportFilename, type PlayerImportIssue } from "@/lib/roster/player-import";
import { buildPlayerImportWorkbook } from "@/lib/roster/player-import-template";
import { getRosterDb } from "@/lib/roster/repository/client";
import { createPlayers } from "@/lib/roster/repository/players";
import { listTeams } from "@/lib/roster/repository/teams";
import { getCurrentSeason } from "@/lib/season";

export type PlayerTemplateResult =
  | { ok: true; filename: string; base64: string }
  | { ok: false; error: string };

export type PlayerImportResult =
  | { ok: true; created: number; issues: PlayerImportIssue[] }
  | { ok: false; error: string; issues?: PlayerImportIssue[] };

function revalidateRoster() {
  revalidatePath("/admin/jugadores", "layout");
  revalidatePath("/admin/ropa/entregas");
}

function friendlyImportError(message: string): string {
  if (/players_dni_season_unique/i.test(message)) {
    return "Ya hay un jugador con ese DNI en esta temporada";
  }
  if (/player_contacts_relationship_chk/i.test(message)) {
    return "El parentesco no es válido para esta base de datos";
  }
  return message;
}

export async function downloadPlayerTemplateAction(): Promise<PlayerTemplateResult> {
  try {
    await requireRosterWriteAccess();
    const season = getCurrentSeason();
    const db = await getRosterDb();
    const teams = await listTeams(db, season);
    const workbook = await buildPlayerImportWorkbook(teams);
    return {
      ok: true,
      filename: playerImportFilename(season),
      base64: workbook.toString("base64"),
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear la plantilla" };
  }
}

export async function importPlayersAction(formData: FormData): Promise<PlayerImportResult> {
  try {
    await requireRosterWriteAccess();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Elige el Excel de la plantilla" };
    }
    if (file.size > 2_000_000) {
      return { ok: false, error: "El archivo pesa demasiado (máx. 2 MB)" };
    }

    const season = getCurrentSeason();
    const db = await getRosterDb();
    const teams = await listTeams(db, season);
    const bytes = Buffer.from(await file.arrayBuffer());
    const parsed = parsePlayerImportFile(bytes, teams, season);

    if (parsed.ready.length === 0) {
      return {
        ok: false,
        error: parsed.issues[0]?.message ?? "No hay filas válidas para importar",
        issues: parsed.issues,
      };
    }

    const result = await createPlayers(
      db,
      parsed.ready.map((item) => item.input),
    );

    const issues = [
      ...parsed.issues,
      ...result.errors.map((error) => ({
        row: parsed.ready[error.index]?.row ?? 0,
        message: `${parsed.ready[error.index]?.label ?? "Jugador"}: ${friendlyImportError(error.message)}`,
      })),
    ];

    if (result.created > 0) revalidateRoster();

    if (result.created === 0) {
      return {
        ok: false,
        error: issues[0]?.message ?? "No se importó ningún jugador",
        issues,
      };
    }

    return { ok: true, created: result.created, issues };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo importar" };
  }
}
