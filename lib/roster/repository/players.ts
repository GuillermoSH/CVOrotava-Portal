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
import {
  matchesChecklistFilter,
  type ChecklistFilter,
  type PlayerFilterContext,
  type PlayerSortDir,
} from "@/lib/roster/player-filters";
import type { RosterDb } from "@/lib/roster/repository/client";
import { getCurrentSeason } from "@/lib/season";
import type {
  PlayerContact,
  PlayerListItem,
  PlayerWithDetails,
  PlayerWithTeam,
} from "@/lib/types/db";

/** Ficha completa — create/update/detalle. */
const PLAYER_DETAIL_SELECT =
  "id, full_name, first_name, last_name, birth_date, team_id, user_id, season, is_active, gender, dni, license_completed, registration_papers_received, docs_delivered_to_family, docs_delivered_at, photo_taken, photo_consent, photo_path, in_whatsapp_group, medical_notes, clothing_size, address, address_street_type, address_street, address_number, address_door, address_postal_code, address_municipality, address_province, birth_country, nationality, pays_extended_monthly, created_at, updated_at, team:teams(id, name, category, gender, season)";

/** Listado admin — sin medical/nationality/photo_path/etc. */
const PLAYER_LIST_SELECT =
  "id, full_name, first_name, last_name, birth_date, team_id, season, is_active, gender, dni, license_completed, registration_papers_received, docs_delivered_to_family, docs_delivered_at, photo_taken, in_whatsapp_group, address_street_type, address_street, address_number, address_door, address_postal_code, address_municipality, address_province, birth_country, team:teams(id, name, category, gender, season)";

export type ListPlayersPageFilters = {
  query?: string;
  statusFilter?: "active" | "all";
  category?: string;
  gender?: string;
  teamId?: string;
  unassigned?: boolean;
  checklist?: ChecklistFilter;
};

export type ListPlayersPageInput = {
  season?: string;
  page?: number;
  pageSize?: number;
  sortDir?: PlayerSortDir;
  filters?: ListPlayersPageFilters;
  context?: PlayerFilterContext;
};

export type ListPlayersPageResult = {
  players: PlayerListItem[];
  total: number;
  page: number;
  pageSize: number;
};

const CHECKLIST_SQL_FILTERS: Partial<
  Record<ChecklistFilter, { column: string; value: boolean } | { complete: true } | { licenseBlocked: true }>
> = {
  missing_papers: { column: "registration_papers_received", value: false },
  missing_docs: { column: "docs_delivered_to_family", value: false },
  missing_photo: { column: "photo_taken", value: false },
  missing_license: { column: "license_completed", value: false },
  missing_whatsapp: { column: "in_whatsapp_group", value: false },
  complete: { complete: true },
  license_blocked: { licenseBlocked: true },
};

function checklistNeedsPostFilter(checklist: ChecklistFilter | undefined): boolean {
  return checklist === "incomplete_profile" || checklist === "missing_matricula";
}

function needsInMemoryPaging(filters: ListPlayersPageFilters): boolean {
  return (
    checklistNeedsPostFilter(filters.checklist) ||
    filters.gender === "male" ||
    filters.gender === "female"
  );
}

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
  gender?: "male" | "female" | null;
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
  pays_extended_monthly?: boolean;
  is_active?: boolean;
  contacts?: PlayerContactInput[];
};

function primaryContactFromContacts(
  contacts: PlayerContact[],
  playerId: string,
): PlayerContact | null {
  const forPlayer = contacts.filter((contact) => contact.player_id === playerId);
  return forPlayer.find((contact) => contact.is_primary) ?? forPlayer[0] ?? null;
}

function primaryPhoneFromContacts(
  contacts: PlayerContact[],
  playerId: string,
): string | null {
  const phone = primaryContactFromContacts(contacts, playerId)?.phone?.trim();
  return phone || null;
}

function primaryEmailFromContacts(
  contacts: PlayerContact[],
  playerId: string,
): string | null {
  const email = primaryContactFromContacts(contacts, playerId)?.email?.trim();
  return email || null;
}

async function attachPrimaryContacts(
  db: RosterDb,
  players: PlayerWithTeam[],
): Promise<PlayerListItem[]> {
  const contacts = await listContactsForPlayers(
    db,
    players.map((player) => player.id),
  );
  return players.map((player) => ({
    ...player,
    primary_phone: primaryPhoneFromContacts(contacts, player.id),
    primary_email: primaryEmailFromContacts(contacts, player.id),
  }));
}

function listSelect(filters: ListPlayersPageFilters): string {
  const needsTeamInner = Boolean(filters.category) || filters.gender === "mixed";
  const teamEmbed = needsTeamInner
    ? "team:teams!inner(id, name, category, gender, season)"
    : "team:teams(id, name, category, gender, season)";
  return PLAYER_LIST_SELECT.replace(
    "team:teams(id, name, category, gender, season)",
    teamEmbed,
  );
}

function applyListFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  season: string,
  filters: ListPlayersPageFilters,
) {
  let q = query.eq("season", season);

  if (filters.statusFilter !== "all") {
    q = q.eq("is_active", true);
  }

  if (filters.unassigned) {
    q = q.is("team_id", null);
  } else if (filters.teamId) {
    q = q.eq("team_id", filters.teamId);
  }

  if (filters.category) {
    q = q.eq("team.category", filters.category);
  }

  // male/female se refinan en memoria (effectivePlayerGender); mixed sí en SQL.
  if (filters.gender === "mixed") {
    q = q.eq("team.gender", "mixed");
  }

  const checklist = filters.checklist;
  if (checklist && !checklistNeedsPostFilter(checklist)) {
    const sqlFilter = CHECKLIST_SQL_FILTERS[checklist];
    if (sqlFilter && "column" in sqlFilter) {
      q = q.eq(sqlFilter.column, sqlFilter.value);
    } else if (sqlFilter && "complete" in sqlFilter) {
      q = q
        .eq("docs_delivered_to_family", true)
        .eq("registration_papers_received", true)
        .eq("photo_taken", true)
        .eq("license_completed", true);
    } else if (sqlFilter && "licenseBlocked" in sqlFilter) {
      q = q
        .eq("license_completed", false)
        .or("registration_papers_received.eq.false,photo_taken.eq.false");
    }
  }

  const search = filters.query?.trim();
  if (search) {
    const escaped = search.replace(/[%_,.()]/g, " ").replace(/\s+/g, " ").trim();
    if (escaped) {
      const pattern = `%${escaped}%`;
      q = q.or(
        `first_name.ilike.${pattern},last_name.ilike.${pattern},full_name.ilike.${pattern},dni.ilike.${pattern}`,
      );
    }
  }

  return q;
}

export async function listPlayers(
  db: RosterDb,
  season: string = getCurrentSeason(),
): Promise<PlayerWithTeam[]> {
  const { data, error } = await db
    .from("players")
    .select(PLAYER_LIST_SELECT)
    .eq("season", season)
    .order("first_name", { ascending: true })
    .order("last_name", { ascending: true });

  if (error) throw new Error(dbErrorMessage(error));
  return (data ?? []).map((row) => mapPlayerWithTeam(row as PlayerRow));
}

export async function listPlayersWithPrimaryPhone(
  db: RosterDb,
  season: string = getCurrentSeason(),
): Promise<PlayerListItem[]> {
  const players = await listPlayers(db, season);
  return attachPrimaryContacts(db, players);
}

/**
 * Página de listado admin: select ligero + filtros/orden/rango en Supabase.
 * Facetas `incomplete_profile` / `missing_matricula` se post-filtran en memoria.
 */
export async function listPlayersPage(
  db: RosterDb,
  input: ListPlayersPageInput = {},
): Promise<ListPlayersPageResult> {
  const season = input.season ?? getCurrentSeason();
  const sortDir = input.sortDir ?? "asc";
  const ascending = sortDir === "asc";
  const filters: ListPlayersPageFilters = input.filters ?? {};
  const pageSizeRaw = input.pageSize ?? 50;
  const pageSize = pageSizeRaw === 0 ? 0 : Math.min(Math.max(pageSizeRaw, 1), 200);
  const page = Math.max(input.page ?? 1, 1);
  const inMemory = needsInMemoryPaging(filters) || pageSize === 0;
  const select = listSelect(filters);

  if (!inMemory) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await applyListFilters(
      db.from("players").select(select, { count: "exact" }),
      season,
      filters,
    )
      .order("first_name", { ascending })
      .order("last_name", { ascending })
      .order("id", { ascending: true })
      .range(from, to);
    if (error) throw new Error(dbErrorMessage(error));
    const rows = (data ?? []) as PlayerRow[];
    const mapped = rows.map((row) => mapPlayerWithTeam(row));
    const players = await attachPrimaryContacts(db, mapped);
    return {
      players,
      total: count ?? players.length,
      page,
      pageSize,
    };
  }

  // "Todos", género m/f, o facetas que requieren post-filtro.
  const { data, error } = await applyListFilters(db.from("players").select(select), season, filters)
    .order("first_name", { ascending })
    .order("last_name", { ascending })
    .order("id", { ascending: true });

  if (error) throw new Error(dbErrorMessage(error));
  const rows = (data ?? []) as PlayerRow[];
  let players = await attachPrimaryContacts(
    db,
    rows.map((row) => mapPlayerWithTeam(row)),
  );

  if (filters.checklist && checklistNeedsPostFilter(filters.checklist)) {
    players = players.filter((player) =>
      matchesChecklistFilter(player, filters.checklist!, input.context),
    );
  }

  if (filters.gender === "male" || filters.gender === "female") {
    const g = filters.gender;
    players = players.filter((player) => {
      const effective = player.gender ?? player.team?.gender ?? null;
      return effective === g;
    });
  }

  const total = players.length;
  if (pageSize === 0) {
    return { players, total, page: 1, pageSize: 0 };
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    players: players.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
  };
}

export async function countInactivePlayers(
  db: RosterDb,
  season: string = getCurrentSeason(),
): Promise<number> {
  const { count, error } = await db
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("season", season)
    .eq("is_active", false);

  if (error) throw new Error(dbErrorMessage(error));
  return count ?? 0;
}

export async function listActivePlayers(
  db: RosterDb,
  season: string = getCurrentSeason(),
): Promise<PlayerWithTeam[]> {
  const { data, error } = await db
    .from("players")
    .select(PLAYER_DETAIL_SELECT)
    .eq("season", season)
    .eq("is_active", true)
    .order("first_name", { ascending: true })
    .order("last_name", { ascending: true });

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

/** Pares id/nombre/user_id para un lote de jugadores (p.ej. registro de pagos en bloque). */
export async function listPlayerUserIds(
  db: RosterDb,
  ids: string[],
): Promise<{ id: string; full_name: string; user_id: string | null }[]> {
  if (ids.length === 0) return [];
  const { data, error } = await db
    .from("players")
    .select("id, full_name, user_id")
    .in("id", ids);

  if (error) throw new Error(dbErrorMessage(error));
  return data ?? [];
}

export async function getPlayerById(
  db: RosterDb,
  id: string,
): Promise<PlayerWithDetails | null> {
  const { data, error } = await db
    .from("players")
    .select(PLAYER_DETAIL_SELECT)
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
  if (input.docs_delivered_at == null || !String(input.docs_delivered_at).trim()) {
    // null/vacío explícito: no inventar fecha (p. ej. import federación)
    return null;
  }
  const value = input.docs_delivered_at.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return docsDeliveredInputToIso(value);
  if (!Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  return null;
}

function playerInsert(input: PlayerWriteInput) {
  return {
    first_name: input.first_name,
    last_name: input.last_name,
    full_name: `${input.first_name} ${input.last_name}`.trim(),
    birth_date: input.birth_date || null,
    dni: input.dni?.trim() || null,
    team_id: input.team_id || null,
    gender: input.gender === "male" || input.gender === "female" ? input.gender : null,
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
    pays_extended_monthly: input.pays_extended_monthly ?? false,
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

const ACTIVE_CHUNK = 200;

export async function bulkSetPlayersActive(
  db: RosterDb,
  playerIds: string[],
  isActive: boolean,
): Promise<number> {
  const uniqueIds = [...new Set(playerIds)];
  if (uniqueIds.length === 0) return 0;

  for (let i = 0; i < uniqueIds.length; i += ACTIVE_CHUNK) {
    const chunk = uniqueIds.slice(i, i + ACTIVE_CHUNK);
    const { error } = await db
      .from("players")
      .update({ is_active: isActive })
      .in("id", chunk);
    if (error) throw new Error(dbErrorMessage(error));
  }

  return uniqueIds.length;
}

export async function bulkSetPlayersTeam(
  db: RosterDb,
  playerIds: string[],
  teamId: string | null,
): Promise<number> {
  const uniqueIds = [...new Set(playerIds)];
  if (uniqueIds.length === 0) return 0;

  for (let i = 0; i < uniqueIds.length; i += ACTIVE_CHUNK) {
    const chunk = uniqueIds.slice(i, i + ACTIVE_CHUNK);
    const { error } = await db
      .from("players")
      .update({ team_id: teamId })
      .in("id", chunk);
    if (error) throw new Error(dbErrorMessage(error));
  }

  return uniqueIds.length;
}

/**
 * Hard-delete roster players (admin). Cleans guardians first; contacts cascade;
 * payments / clothing movements keep history with player_id null.
 * Caller should remove Storage photos when possible.
 */
export async function deletePlayers(
  db: RosterDb,
  playerIds: string[],
): Promise<{ deleted: number; photoPaths: string[] }> {
  const uniqueIds = [...new Set(playerIds)];
  if (uniqueIds.length === 0) return { deleted: 0, photoPaths: [] };

  const photoPaths: string[] = [];
  for (let i = 0; i < uniqueIds.length; i += ACTIVE_CHUNK) {
    const chunk = uniqueIds.slice(i, i + ACTIVE_CHUNK);

    const { data: rows, error: selectError } = await db
      .from("players")
      .select("id, photo_path")
      .in("id", chunk);
    if (selectError) throw new Error(dbErrorMessage(selectError));

    for (const row of rows ?? []) {
      const path =
        typeof row.photo_path === "string" && row.photo_path.trim()
          ? row.photo_path.trim()
          : `${row.id}/avatar.webp`;
      photoPaths.push(path);
    }

    const { error: guardiansError } = await db
      .from("player_guardians")
      .delete()
      .in("player_id", chunk);
    if (guardiansError) throw new Error(dbErrorMessage(guardiansError));

    const { error: deleteError } = await db.from("players").delete().in("id", chunk);
    if (deleteError) throw new Error(dbErrorMessage(deleteError));
  }

  return { deleted: uniqueIds.length, photoPaths };
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

/** DNIs normalizados (mayúsculas, sin separadores) de la temporada. */
export async function listPlayerDnisForSeason(
  db: RosterDb,
  season: string = getCurrentSeason(),
): Promise<Set<string>> {
  const { data, error } = await db.from("players").select("dni").eq("season", season).not("dni", "is", null);

  if (error) throw new Error(dbErrorMessage(error));
  const set = new Set<string>();
  for (const row of data ?? []) {
    const dni = typeof row.dni === "string" ? row.dni.trim().toUpperCase().replace(/[\s.-]/g, "") : "";
    if (dni) set.add(dni);
  }
  return set;
}
