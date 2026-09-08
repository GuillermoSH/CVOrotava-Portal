"use server";

import { revalidatePath } from "next/cache";

import { contactsForPlayerAge } from "@/lib/roster/age";
import { requireRosterWriteAccess } from "@/lib/roster/auth";
import { getRosterDb } from "@/lib/roster/repository/client";
import {
  createPlayer,
  getPlayerById,
  setPlayerActive,
  updatePlayer,
} from "@/lib/roster/repository/players";
import { createTeam, getTeamById } from "@/lib/roster/repository/teams";
import {
  createPlayerSchema,
  createTeamSchema,
  setPlayerActiveSchema,
  updatePlayerSchema,
} from "@/lib/roster/schemas";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function revalidateRoster() {
  revalidatePath("/admin/jugadores", "layout");
  revalidatePath("/admin/ropa/entregas");
}

function friendlyDbError(message: string): string {
  if (/players_dni_season_unique/i.test(message)) {
    return "Ya hay un jugador con ese DNI en esta temporada";
  }
  if (/player_contacts_primary/i.test(message)) {
    return "Solo puede haber un contacto principal";
  }
  if (/player_contacts_relationship_chk/i.test(message)) {
    return "El parentesco no es válido. Si es mayor de edad, aplica en Supabase la migración 20260907150000_player_self_contact.sql.";
  }
  if (/clothing_size/i.test(message) && /does not exist|schema cache/i.test(message)) {
    return "Falta aplicar la migración de ficha de jugador en Supabase.";
  }
  if (/first_name|player_contacts/i.test(message) && /does not exist|schema cache/i.test(message)) {
    return "Falta aplicar la migración de ficha de jugador (20260907140000) en Supabase.";
  }
  return message;
}

export async function createPlayerAction(input: unknown): Promise<ActionResult> {
  try {
    await requireRosterWriteAccess();
    const parsed = createPlayerSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getRosterDb();
    const team = await getTeamById(db, parsed.data.team_id);
    if (!team) return { ok: false, error: "Equipo no encontrado" };
    if (team.season !== parsed.data.season) {
      return { ok: false, error: "El equipo no es de esta temporada" };
    }

    const contacts = contactsForPlayerAge({
      birthDate: parsed.data.birth_date,
      firstName: parsed.data.first_name,
      lastName: parsed.data.last_name,
      contacts: parsed.data.contacts,
    });

    const player = await createPlayer(db, { ...parsed.data, contacts });
    revalidateRoster();
    return { ok: true, id: player.id };
  } catch (e) {
    return {
      ok: false,
      error: friendlyDbError(e instanceof Error ? e.message : "No autorizado"),
    };
  }
}

export async function updatePlayerAction(input: unknown): Promise<ActionResult> {
  try {
    await requireRosterWriteAccess();
    const parsed = updatePlayerSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getRosterDb();
    const existing = await getPlayerById(db, parsed.data.id);
    if (!existing) return { ok: false, error: "Jugador no encontrado" };

    const team = await getTeamById(db, parsed.data.team_id);
    if (!team) return { ok: false, error: "Equipo no encontrado" };

    const contacts = contactsForPlayerAge({
      birthDate: parsed.data.birth_date,
      firstName: parsed.data.first_name,
      lastName: parsed.data.last_name,
      contacts: parsed.data.contacts,
    });

    await updatePlayer(db, parsed.data.id, { ...parsed.data, contacts });
    revalidateRoster();
    return { ok: true, id: parsed.data.id };
  } catch (e) {
    return {
      ok: false,
      error: friendlyDbError(e instanceof Error ? e.message : "No autorizado"),
    };
  }
}

export async function setPlayerActiveAction(input: unknown): Promise<ActionResult> {
  try {
    await requireRosterWriteAccess();
    const parsed = setPlayerActiveSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getRosterDb();
    const existing = await getPlayerById(db, parsed.data.id);
    if (!existing) return { ok: false, error: "Jugador no encontrado" };

    await setPlayerActive(db, parsed.data.id, parsed.data.is_active);
    revalidateRoster();
    return { ok: true, id: parsed.data.id };
  } catch (e) {
    return {
      ok: false,
      error: friendlyDbError(e instanceof Error ? e.message : "No autorizado"),
    };
  }
}

export async function createTeamAction(input: unknown): Promise<ActionResult> {
  try {
    await requireRosterWriteAccess();
    const parsed = createTeamSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const db = await getRosterDb();
    const team = await createTeam(db, parsed.data);
    revalidateRoster();
    return { ok: true, id: team.id };
  } catch (e) {
    return {
      ok: false,
      error: friendlyDbError(e instanceof Error ? e.message : "No autorizado"),
    };
  }
}
