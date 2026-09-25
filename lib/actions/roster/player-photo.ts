"use server";

import { revalidatePath } from "next/cache";

import { requireRosterWriteAccess } from "@/lib/roster/auth";
import {
  PLAYER_PHOTOS_BUCKET,
  avatarObjectPath,
} from "@/lib/roster/player-photo";
import { getRosterDb } from "@/lib/roster/repository/client";
import { getPlayerById } from "@/lib/roster/repository/players";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type PhotoActionResult =
  | { ok: true; path?: string; photo_taken?: boolean }
  | { ok: false; error: string };

export type PhotoUploadUrlResult =
  | { ok: true; signedUrl: string; token: string; path: string }
  | { ok: false; error: string };

function revalidatePlayer(playerId: string) {
  revalidatePath("/admin/jugadores", "layout");
  revalidatePath(`/admin/jugadores/${playerId}`);
}

export async function createPlayerPhotoUploadUrl(
  playerId: string,
): Promise<PhotoUploadUrlResult> {
  try {
    await requireRosterWriteAccess();
    if (!playerId?.trim()) return { ok: false, error: "Jugador no válido" };

    const db = await getRosterDb();
    const player = await getPlayerById(db, playerId);
    if (!player) return { ok: false, error: "Jugador no encontrado" };

    const path = avatarObjectPath(player.id);
    const admin = createServiceRoleClient();
    const { data, error } = await admin.storage
      .from(PLAYER_PHOTOS_BUCKET)
      .createSignedUploadUrl(path, { upsert: true });

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "No se pudo preparar la subida",
      };
    }

    return {
      ok: true,
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No autorizado",
    };
  }
}

export async function confirmPlayerPhoto(
  playerId: string,
): Promise<PhotoActionResult> {
  try {
    await requireRosterWriteAccess();
    if (!playerId?.trim()) return { ok: false, error: "Jugador no válido" };

    const db = await getRosterDb();
    const player = await getPlayerById(db, playerId);
    if (!player) return { ok: false, error: "Jugador no encontrado" };

    const path = avatarObjectPath(player.id);
    const admin = createServiceRoleClient();
    const { data: object, error: downloadError } = await admin.storage
      .from(PLAYER_PHOTOS_BUCKET)
      .download(path);

    if (downloadError || !object) {
      return { ok: false, error: "No se encontró la foto subida" };
    }

    const patch: { photo_path: string; photo_taken?: boolean } = {
      photo_path: path,
    };
    // Solo marcar checklist si aún no estaba; no tocar photo_consent.
    if (!player.photo_taken) {
      patch.photo_taken = true;
    }

    const { error } = await db.from("players").update(patch).eq("id", player.id);
    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePlayer(player.id);
    return {
      ok: true,
      path,
      photo_taken: patch.photo_taken ?? player.photo_taken,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No autorizado",
    };
  }
}

export async function removePlayerPhoto(
  playerId: string,
): Promise<PhotoActionResult> {
  try {
    await requireRosterWriteAccess();
    if (!playerId?.trim()) return { ok: false, error: "Jugador no válido" };

    const db = await getRosterDb();
    const player = await getPlayerById(db, playerId);
    if (!player) return { ok: false, error: "Jugador no encontrado" };

    const path = player.photo_path?.trim() || avatarObjectPath(player.id);
    const admin = createServiceRoleClient();
    const { error: storageError } = await admin.storage
      .from(PLAYER_PHOTOS_BUCKET)
      .remove([path]);

    // Si el objeto no existe, seguimos limpiando photo_path en DB.
    if (storageError && !/not found|Object not found/i.test(storageError.message)) {
      return { ok: false, error: storageError.message };
    }

    const { error } = await db
      .from("players")
      .update({ photo_path: null })
      .eq("id", player.id);
    if (error) {
      return { ok: false, error: error.message };
    }

    // No tocar photo_taken ni photo_consent.
    revalidatePlayer(player.id);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No autorizado",
    };
  }
}
