"use server";

import { invalidateRoster } from "@/lib/cache/invalidate";

import type {
  FederationImportChunkResult,
  FederationImportConfirmResult,
  FederationImportPreview,
  FederationImportPreviewResult,
} from "@/lib/roster/federation-import-types";
import { FEDERATION_IMPORT_CHUNK_SIZE } from "@/lib/roster/federation-import-types";
import {
  FEDERATION_IMPORT_MAX_ROWS,
  parseFederationImportCsv,
  type FederationImportParseResult,
} from "@/lib/roster/federation-import";
import { requireRosterWriteAccess } from "@/lib/roster/auth";
import { normalizeDocumentId } from "@/lib/roster/document";
import { federationIdentityKey } from "@/lib/roster/federation-import";
import { getRosterDb } from "@/lib/roster/repository/client";
import { createPlayers, listPlayers } from "@/lib/roster/repository/players";
import { ensureFederationBaseTeams, listTeams } from "@/lib/roster/repository/teams";
import { getCurrentSeason } from "@/lib/season";

export type {
  FederationImportChunkResult,
  FederationImportConfirmResult,
  FederationImportDiscardedItem,
  FederationImportIncompleteItem,
  FederationImportPreview,
  FederationImportPreviewResult,
  FederationImportToImportItem,
} from "@/lib/roster/federation-import-types";

const MAX_FILE_BYTES = 2_000_000;

function foldTeamName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function toUiPreview(parsed: FederationImportParseResult): FederationImportPreview {
  return {
    toImport: parsed.toImport.map((item) => ({
      row: item.row,
      label: item.label,
      dni: item.dni,
      teamName: item.teamName ?? "Sin equipo",
      missingFields: item.missingFields,
    })),
    discarded: parsed.discarded.map((item) => ({
      row: item.row,
      label: item.label,
      dni: null,
      reason: item.detail ? `${item.reasonLabel}: ${item.detail}` : item.reasonLabel,
    })),
    incomplete: parsed.incomplete.map((item) => ({
      row: item.row,
      label: item.label,
      dni: item.dni,
      teamName: item.teamName ?? "Sin equipo",
      missingFields: item.missingFields,
    })),
    teamsToCreate: parsed.teamsToCreate.map((team) => team.name),
    counts: parsed.counts,
  };
}

function readCsvFile(formData: FormData): { ok: true; file: File } | { ok: false; error: string } {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Elige el CSV de licencias de la Federación" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "El archivo pesa demasiado (máx. 2 MB)" };
  }
  const name = file.name.toLowerCase();
  if (
    name &&
    !name.endsWith(".csv") &&
    file.type &&
    !file.type.includes("csv") &&
    file.type !== "text/plain" &&
    file.type !== "application/vnd.ms-excel"
  ) {
    return { ok: false, error: "Sube un archivo .csv de la Federación" };
  }
  return { ok: true, file };
}

function readAck(formData: FormData): boolean {
  const ackRaw = formData.get("acknowledge_incomplete");
  return ackRaw === "1" || ackRaw === "true" || ackRaw === "on" || ackRaw === "yes";
}

function readNonNegInt(formData: FormData, key: string, fallback: number): number {
  const raw = formData.get(key);
  if (typeof raw !== "string" || raw.trim() === "") return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

async function loadParseContext() {
  const season = getCurrentSeason();
  const db = await getRosterDb();
  const [teams, players] = await Promise.all([listTeams(db, season), listPlayers(db, season)]);
  const existingDnis = new Set(
    players
      .map((player) => player.dni?.trim())
      .filter((dni): dni is string => Boolean(dni))
      .map((dni) => normalizeDocumentId(dni)),
  );
  const existingIdentities = new Set(
    players
      .filter((player) => Boolean(player.birth_date?.trim()))
      .map((player) =>
        federationIdentityKey(player.first_name, player.last_name, player.birth_date!.trim()),
      ),
  );
  return { season, db, teams, existingDnis, existingIdentities };
}

function validateParsedForImport(
  parsed: FederationImportParseResult,
  acknowledged: boolean,
): { ok: true } | { ok: false; error: string } {
  if (parsed.counts.toImport === 0) {
    return {
      ok: false,
      error: parsed.discarded[0]
        ? parsed.discarded[0].detail
          ? `${parsed.discarded[0].reasonLabel}: ${parsed.discarded[0].detail}`
          : parsed.discarded[0].reasonLabel
        : "No hay jugadores válidos para importar",
    };
  }

  if (parsed.counts.incomplete > 0 && !acknowledged) {
    return {
      ok: false,
      error: `Marca que has revisado las ${parsed.counts.incomplete} fichas incompletas`,
    };
  }

  if (parsed.toImport.length > FEDERATION_IMPORT_MAX_ROWS) {
    return { ok: false, error: `Demasiadas filas (máx. ${FEDERATION_IMPORT_MAX_ROWS})` };
  }

  return { ok: true };
}

export async function previewFederationImportAction(
  formData: FormData,
): Promise<FederationImportPreviewResult> {
  try {
    await requireRosterWriteAccess();
    const fileCheck = readCsvFile(formData);
    if (!fileCheck.ok) return fileCheck;

    const bytes = Buffer.from(await fileCheck.file.arrayBuffer());
    const { season, teams, existingDnis, existingIdentities } = await loadParseContext();
    const parsed = parseFederationImportCsv(bytes, {
      season,
      teams,
      existingDnis,
      existingIdentities,
    });

    if (parsed.counts.toImport === 0 && parsed.counts.discarded === 0) {
      return { ok: false, error: "El CSV no tiene filas de jugadores" };
    }

    return { ok: true, ...toUiPreview(parsed) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo preparar la vista previa",
    };
  }
}

/**
 * Importa el siguiente lote de pendientes (re-parsea contra DNIs actuales).
 * No usa offset: tras cada lote los ya creados salen de toImport.
 */
export async function importFederationChunkAction(
  formData: FormData,
): Promise<FederationImportChunkResult> {
  try {
    await requireRosterWriteAccess();
    const fileCheck = readCsvFile(formData);
    if (!fileCheck.ok) return fileCheck;

    const acknowledged = readAck(formData);
    const limit = Math.min(
      Math.max(readNonNegInt(formData, "limit", FEDERATION_IMPORT_CHUNK_SIZE), 1),
      50,
    );
    // Total del preview (estable); si falta, se usa el tamaño del lote pendiente.
    const previewTotal = readNonNegInt(formData, "preview_total", 0);

    const bytes = Buffer.from(await fileCheck.file.arrayBuffer());
    const { season, db, teams, existingDnis, existingIdentities } = await loadParseContext();
    const parsed = parseFederationImportCsv(bytes, {
      season,
      teams,
      existingDnis,
      existingIdentities,
    });

    const remaining = parsed.toImport.length;
    if (remaining === 0) {
      return {
        ok: true,
        created: 0,
        failed: 0,
        processed: previewTotal,
        total: previewTotal,
        teamsCreated: 0,
        incompleteCount: 0,
        remainingAfter: 0,
        done: true,
        nextOffset: 0,
      };
    }

    const gate = validateParsedForImport(parsed, acknowledged);
    if (!gate.ok) return gate;

    const teamKeys = [
      ...new Map(
        parsed.toImport
          .filter((item) => item.teamKey)
          .map((item) => [foldTeamName(item.teamKey!.name), item.teamKey!] as const),
      ).values(),
    ];

    const existingNames = new Set(teams.map((team) => foldTeamName(team.name)));
    const ensured = await ensureFederationBaseTeams(db, teamKeys, season);
    const teamsCreated = teamKeys.filter((key) => !existingNames.has(foldTeamName(key.name))).length;

    const slice = parsed.toImport.slice(0, limit);
    const inputs = slice.map((item) => {
      const teamId = item.teamKey
        ? ensured.get(foldTeamName(item.teamKey.name))?.id ?? null
        : null;
      return {
        ...item.input,
        team_id: teamId,
      };
    });

    const result = await createPlayers(db, inputs);

    if (slice.length > 0 && result.created === 0 && result.errors.length > 0) {
      return {
        ok: false,
        error: result.errors[0]?.message ?? "No se pudo importar el lote",
      };
    }

    const remainingAfter = Math.max(0, remaining - slice.length);
    const total = previewTotal > 0 ? previewTotal : remaining;
    const processed = Math.min(total, total - remainingAfter);
    const done = remainingAfter === 0;

    if (result.created > 0 || done) invalidateRoster(getCurrentSeason());

    return {
      ok: true,
      created: result.created,
      failed: result.errors.length,
      processed,
      total,
      teamsCreated,
      incompleteCount: parsed.counts.incomplete,
      remainingAfter,
      done,
      nextOffset: 0,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo importar el lote",
    };
  }
}

/** Importación completa en una sola llamada (p. ej. pruebas). La UI usa lotes. */
export async function confirmFederationImportAction(
  formData: FormData,
): Promise<FederationImportConfirmResult> {
  try {
    await requireRosterWriteAccess();
    const fileCheck = readCsvFile(formData);
    if (!fileCheck.ok) return fileCheck;

    let created = 0;
    let teamsCreated = 0;
    let incompleteCount = 0;
    let previewTotal = 0;
    let guard = 0;

    while (guard < 200) {
      guard += 1;
      const chunkData = new FormData();
      chunkData.set("file", fileCheck.file);
      const ack = formData.get("acknowledge_incomplete");
      if (typeof ack === "string") chunkData.set("acknowledge_incomplete", ack);
      chunkData.set("limit", String(FEDERATION_IMPORT_CHUNK_SIZE));
      if (previewTotal > 0) chunkData.set("preview_total", String(previewTotal));

      const chunk = await importFederationChunkAction(chunkData);
      if (!chunk.ok) return chunk;

      if (previewTotal === 0 && chunk.total > 0) previewTotal = chunk.total;
      created += chunk.created;
      teamsCreated += chunk.teamsCreated;
      incompleteCount = chunk.incompleteCount;
      if (chunk.done) break;
    }

    if (created === 0) {
      return { ok: false, error: "No se importó ningún jugador" };
    }

    return { ok: true, created, teamsCreated, incompleteCount };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo confirmar la importación",
    };
  }
}
