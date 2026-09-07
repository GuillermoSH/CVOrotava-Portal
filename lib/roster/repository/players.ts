import { dbErrorMessage } from "@/lib/clothing/repository/helpers";
import {
  mapPlayerContact,
  mapPlayerWithTeam,
  type PlayerRow,
} from "@/lib/roster/mappers";
import type { RosterDb } from "@/lib/roster/repository/client";
import { getCurrentSeason } from "@/lib/season";
import type {
  PlayerContact,
  PlayerWithDetails,
  PlayerWithTeam,
} from "@/lib/types/db";

const PLAYER_SELECT =
  "id, full_name, first_name, last_name, birth_date, team_id, user_id, season, is_active, dni, license_completed, registration_papers_received, medical_notes, clothing_size, address, created_at, updated_at, team:teams(id, name, category, gender, season)";

export type PlayerContactInput = {
  full_name: string;
  relationship: PlayerContact["relationship"];
  phone?: string | null;
  email?: string | null;
  is_primary?: boolean;
};

export type PlayerWriteInput = {
  first_name: string;
  last_name: string;
  birth_date?: string | null;
  dni?: string | null;
  team_id: string;
  season: string;
  license_completed?: boolean;
  registration_papers_received?: boolean;
  medical_notes?: string | null;
  clothing_size?: string | null;
  address?: string | null;
  is_active?: boolean;
  contacts?: PlayerContactInput[];
};

export async function listPlayers(
  db: RosterDb,
  season: string = getCurrentSeason(),
): Promise<PlayerWithTeam[]> {
  const { data, error } = await db
    .from("players")
    .select(PLAYER_SELECT)
    .eq("season", season)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) throw new Error(dbErrorMessage(error));
  return (data ?? []).map((row) => mapPlayerWithTeam(row as PlayerRow));
}

export async function listActivePlayers(
  db: RosterDb,
  season: string = getCurrentSeason(),
): Promise<PlayerWithTeam[]> {
  const { data, error } = await db
    .from("players")
    .select(PLAYER_SELECT)
    .eq("season", season)
    .eq("is_active", true)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) throw new Error(dbErrorMessage(error));
  return (data ?? []).map((row) => mapPlayerWithTeam(row as PlayerRow));
}

export async function listContactsForPlayers(
  db: RosterDb,
  playerIds: string[],
): Promise<PlayerContact[]> {
  if (playerIds.length === 0) return [];
  const { data, error } = await db
    .from("player_contacts")
    .select("id, player_id, full_name, relationship, phone, email, is_primary, portal_user_id, created_at")
    .in("player_id", playerIds)
    .order("is_primary", { ascending: false });

  if (error) throw new Error(dbErrorMessage(error));
  return (data ?? []).map(mapPlayerContact);
}

export async function getPlayerById(
  db: RosterDb,
  id: string,
): Promise<PlayerWithDetails | null> {
  const { data, error } = await db
    .from("players")
    .select(PLAYER_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(dbErrorMessage(error));
  if (!data) return null;

  const player = mapPlayerWithTeam(data as PlayerRow);
  const contacts = await listContactsForPlayers(db, [id]);
  return { ...player, contacts };
}

async function replaceContacts(
  db: RosterDb,
  playerId: string,
  contacts: PlayerContactInput[],
): Promise<void> {
  const { error: deleteError } = await db.from("player_contacts").delete().eq("player_id", playerId);
  if (deleteError) throw new Error(dbErrorMessage(deleteError));
  if (contacts.length === 0) return;

  const rows = contacts.map((contact, index) => ({
    player_id: playerId,
    full_name: contact.full_name,
    relationship: contact.relationship,
    phone: contact.phone?.trim() || null,
    email: contact.email?.trim() || null,
    is_primary: contact.is_primary ?? index === 0,
  }));

  if (!rows.some((row) => row.is_primary) && rows[0]) {
    rows[0].is_primary = true;
  }

  const { error } = await db.from("player_contacts").insert(rows);
  if (error) throw new Error(dbErrorMessage(error));
}

function playerInsert(input: PlayerWriteInput) {
  return {
    first_name: input.first_name,
    last_name: input.last_name,
    full_name: `${input.first_name} ${input.last_name}`.trim(),
    birth_date: input.birth_date || null,
    dni: input.dni?.trim() || null,
    team_id: input.team_id,
    season: input.season,
    license_completed: input.license_completed ?? false,
    registration_papers_received: input.registration_papers_received ?? false,
    medical_notes: input.medical_notes?.trim() || null,
    clothing_size: input.clothing_size || null,
    address: input.address?.trim() || null,
    is_active: input.is_active ?? true,
  };
}

export async function createPlayer(db: RosterDb, input: PlayerWriteInput): Promise<PlayerWithDetails> {
  const { data, error } = await db
    .from("players")
    .insert(playerInsert(input))
    .select("id")
    .single();

  if (error) throw new Error(dbErrorMessage(error));
  await replaceContacts(db, data.id, input.contacts ?? []);
  const player = await getPlayerById(db, data.id);
  if (!player) throw new Error("No se pudo leer el jugador creado");
  return player;
}

export async function updatePlayer(
  db: RosterDb,
  id: string,
  input: PlayerWriteInput,
): Promise<PlayerWithDetails> {
  const { error } = await db.from("players").update(playerInsert(input)).eq("id", id);
  if (error) throw new Error(dbErrorMessage(error));
  await replaceContacts(db, id, input.contacts ?? []);
  const player = await getPlayerById(db, id);
  if (!player) throw new Error("Jugador no encontrado");
  return player;
}

export async function setPlayerActive(
  db: RosterDb,
  id: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await db.from("players").update({ is_active: isActive }).eq("id", id);
  if (error) throw new Error(dbErrorMessage(error));
}
