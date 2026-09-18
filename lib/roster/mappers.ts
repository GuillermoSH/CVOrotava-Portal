import type { ClothingSize, Player, PlayerContact, PlayerWithTeam, Team } from "@/lib/types/db";

export type TeamRow = {
  id: string;
  name: string;
  category: string;
  gender: string;
  season: string;
  created_at?: string;
};

export type PlayerRow = {
  id: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  birth_date: string | null;
  team_id: string | null;
  user_id: string | null;
  season: string;
  is_active: boolean;
  dni?: string | null;
  license_completed?: boolean | null;
  registration_papers_received?: boolean | null;
  docs_delivered_to_family?: boolean | null;
  docs_delivered_at?: string | null;
  photo_taken?: boolean | null;
  photo_consent?: boolean | null;
  in_whatsapp_group?: boolean | null;
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
  created_at?: string;
  updated_at?: string;
  teams?: TeamRow | TeamRow[] | null;
  team?: TeamRow | TeamRow[] | null;
};

export type PlayerContactRow = {
  id: string;
  player_id: string;
  full_name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  portal_user_id: string | null;
  created_at: string;
};

function relatedTeam(row: PlayerRow): TeamRow | null {
  const raw = row.team ?? row.teams;
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

export function mapTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    gender: row.gender as Team["gender"],
    season: row.season,
  };
}

function splitLegacyName(fullName: string): { first_name: string; last_name: string } {
  const trimmed = fullName.trim();
  const space = trimmed.indexOf(" ");
  if (space === -1) return { first_name: trimmed, last_name: trimmed };
  return {
    first_name: trimmed.slice(0, space),
    last_name: trimmed.slice(space + 1).trim() || trimmed,
  };
}

export function mapPlayer(row: PlayerRow): Player {
  const names =
    row.first_name && row.last_name
      ? { first_name: row.first_name, last_name: row.last_name }
      : splitLegacyName(row.full_name);

  return {
    id: row.id,
    full_name: row.full_name,
    first_name: names.first_name,
    last_name: names.last_name,
    birth_date: row.birth_date,
    team_id: row.team_id,
    user_id: row.user_id,
    season: row.season,
    is_active: row.is_active,
    dni: row.dni ?? null,
    license_completed: Boolean(row.license_completed),
    registration_papers_received: Boolean(row.registration_papers_received),
    docs_delivered_to_family: Boolean(row.docs_delivered_to_family),
    docs_delivered_at: row.docs_delivered_at ?? null,
    photo_taken: Boolean(row.photo_taken),
    photo_consent: Boolean(row.photo_consent),
    in_whatsapp_group: Boolean(row.in_whatsapp_group),
    medical_notes: row.medical_notes ?? null,
    clothing_size: (row.clothing_size as ClothingSize | null) ?? null,
    address: row.address ?? null,
    address_street_type: row.address_street_type ?? null,
    address_street: row.address_street ?? null,
    address_number: row.address_number ?? null,
    address_door: row.address_door ?? null,
    address_postal_code: row.address_postal_code ?? null,
    address_municipality: row.address_municipality ?? null,
    address_province: row.address_province ?? null,
    birth_country: row.birth_country ?? null,
    nationality: row.nationality ?? null,
  };
}

export function mapPlayerWithTeam(row: PlayerRow): PlayerWithTeam {
  const teamRow = relatedTeam(row);
  return {
    ...mapPlayer(row),
    team: teamRow ? mapTeam(teamRow) : null,
  };
}

export function mapPlayerContact(row: PlayerContactRow): PlayerContact {
  return {
    id: row.id,
    player_id: row.player_id,
    full_name: row.full_name,
    relationship: row.relationship as PlayerContact["relationship"],
    phone: row.phone,
    email: row.email,
    is_primary: row.is_primary,
    portal_user_id: row.portal_user_id,
  };
}
