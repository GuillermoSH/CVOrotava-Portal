import { dbErrorMessage } from "@/lib/clothing/repository/helpers";
import { formatPlayerAddress } from "@/lib/roster/address";
import { isSpanishNationality } from "@/lib/roster/document";
import {
  mapPlayerContact,
  mapPlayerWithTeam,
  type PlayerRow,
} from "@/lib/roster/mappers";
import {
  docsDeliveredInputToIso,
  type PlayerListToggleField,
} from "@/lib/roster/onboarding";
import type { RosterDb } from "@/lib/roster/repository/client";
import { getCurrentSeason } from "@/lib/season";
import type {
  PlayerContact,
  PlayerListItem,
  PlayerWithDetails,
  PlayerWithTeam,
} from "@/lib/types/db";

const PLAYER_SELECT =
  "id, full_name, first_name, last_name, birth_date, team_id, user_id, season, is_active, dni, license_completed, registration_papers_received, docs_delivered_to_family, docs_delivered_at, photo_taken, photo_consent, in_whatsapp_group, medical_notes, clothing_size, address, address_street_type, address_street, address_number, address_door, address_postal_code, address_municipality, address_province, birth_country, nationality, created_at, updated_at, team:teams(id, name, category, gender, season)";

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
  team_id?: string | null;
  season: string;
  license_completed?: boolean;
  registration_papers_received?: boolean;
  docs_delivered_to_family?: boolean;
  docs_delivered_at?: string | null;
  photo_taken?: boolean;
  photo_consent?: boolean;
  in_whatsapp_group?: boolean;
  medical_notes?: string | null;
  clothing_size?: string | null;
  address?: string | null;
  address_street_type?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_door?: string | null;
  address_postal_code?: string | null;
  address_municipality?: string | null;
  address_province?: string | null;
  birth_country?: string | null;
  nationality?: string | null;
  is_active?: boolean;
  contacts?: PlayerContactInput[];
};

function primaryPhoneFromContacts(
  contacts: PlayerContact[],
  playerId: string,
): string | null {
  const forPlayer = contacts.filter((contact) => contact.player_id === playerId);
  const primary = forPlayer.find((contact) => contact.is_primary) ?? forPlayer[0];
  const phone = primary?.phone?.trim();
  return phone || null;
}

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

export async function listPlayersWithPrimaryPhone(
  db: RosterDb,
  season: string = getCurrentSeason(),
): Promise<PlayerListItem[]> {
  const players = await listPlayers(db, season);
  const contacts = await listContactsForPlayers(
    db,
    players.map((player) => player.id),
  );
  return players.map((player) => ({
    ...player,
    primary_phone: primaryPhoneFromContacts(contacts, player.id),
  }));
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
  if (!error) return;

  const message = dbErrorMessage(error);
  // Remote DBs that ran the ficha migration before `jugador` existed still reject
  // that parentesco. Store the adult as `otro` so the ficha can be saved; the
  // form already treats mayores de edad by birth date, not by this value.
  if (
    /player_contacts_relationship_chk/i.test(message) &&
    rows.some((row) => row.relationship === "jugador")
  ) {
    const fallbackRows = rows.map((row) =>
      row.relationship === "jugador" ? { ...row, relationship: "otro" as const } : row,
    );
    const retry = await db.from("player_contacts").insert(fallbackRows);
    if (retry.error) throw new Error(dbErrorMessage(retry.error));
    return;
  }

  throw new Error(message);
}

function resolveDocsDeliveredAt(input: PlayerWriteInput): string | null {
  if (!input.docs_delivered_to_family) return null;
  if (input.docs_delivered_at) {
    const value = input.docs_delivered_at.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return docsDeliveredInputToIso(value);
    if (!Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  }
  return new Date().toISOString();
}

function playerInsert(input: PlayerWriteInput) {
  return {
    first_name: input.first_name,
    last_name: input.last_name,
    full_name: `${input.first_name} ${input.last_name}`.trim(),
    birth_date: input.birth_date || null,
    dni: input.dni?.trim() || null,
    team_id: input.team_id || null,
    season: input.season,
    license_completed: input.license_completed ?? false,
    registration_papers_received: input.registration_papers_received ?? false,
    docs_delivered_to_family: input.docs_delivered_to_family ?? false,
    docs_delivered_at: resolveDocsDeliveredAt(input),
    photo_taken: input.photo_taken ?? false,
    photo_consent: input.photo_consent ?? false,
    in_whatsapp_group: input.in_whatsapp_group ?? false,
    medical_notes: input.medical_notes?.trim() || null,
    clothing_size: input.clothing_size || null,
    address: formatPlayerAddress({
      street_type: input.address_street_type,
      street: input.address_street,
      number: input.address_number,
      door: input.address_door,
      postal_code: input.address_postal_code,
      municipality: input.address_municipality,
      province: input.address_province,
      fallback: input.address,
    }),
    address_street_type: input.address_street_type?.trim() || null,
    address_street: input.address_street?.trim() || null,
    address_number: input.address_number?.trim() || null,
    address_door: input.address_door?.trim() || null,
    address_postal_code: input.address_postal_code?.trim() || null,
    address_municipality: input.address_municipality?.trim() || null,
    address_province: input.address_province?.trim() || null,
    birth_country: input.birth_country?.trim() || null,
    nationality:
      input.nationality?.trim() && !isSpanishNationality(input.nationality)
        ? input.nationality.trim()
        : null,
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

export async function updatePlayerChecklistField(
  db: RosterDb,
  id: string,
  field: PlayerListToggleField,
  value: boolean,
): Promise<void> {
  const patch: Record<string, boolean | string | null> = { [field]: value };
  if (field === "docs_delivered_to_family") {
    patch.docs_delivered_at = value ? new Date().toISOString() : null;
  }
  const { error } = await db.from("players").update(patch).eq("id", id);
  if (error) throw new Error(dbErrorMessage(error));
}

const CHECKLIST_CHUNK = 200;

export async function bulkUpdatePlayerChecklist(
  db: RosterDb,
  playerIds: string[],
  field: PlayerListToggleField,
  value: boolean,
): Promise<number> {
  const uniqueIds = [...new Set(playerIds)];
  if (uniqueIds.length === 0) return 0;

  const patch: Record<string, boolean | string | null> = { [field]: value };
  if (field === "docs_delivered_to_family") {
    patch.docs_delivered_at = value ? new Date().toISOString() : null;
  }

  for (let i = 0; i < uniqueIds.length; i += CHECKLIST_CHUNK) {
    const chunk = uniqueIds.slice(i, i + CHECKLIST_CHUNK);
    const { error } = await db.from("players").update(patch).in("id", chunk);
    if (error) throw new Error(dbErrorMessage(error));
  }

  return uniqueIds.length;
}

export async function createPlayers(
  db: RosterDb,
  inputs: PlayerWriteInput[],
): Promise<{ created: number; errors: { index: number; message: string }[] }> {
  const errors: { index: number; message: string }[] = [];
  let created = 0;

  for (const [index, input] of inputs.entries()) {
    try {
      await createPlayer(db, input);
      created += 1;
    } catch (error) {
      errors.push({
        index,
        message: error instanceof Error ? error.message : "No se pudo crear el jugador",
      });
    }
  }

  return { created, errors };
}
