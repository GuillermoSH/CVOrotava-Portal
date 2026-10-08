import { formatClothingSize } from "@/lib/clothing/formatSize";
import { formatPlayerAddress } from "@/lib/roster/address";
import {
  CONTACT_RELATIONSHIP_LABELS,
  PLAYER_GENDER_LABELS,
  STREET_TYPE_LABELS,
  formatTeamCategory,
  type ContactRelationship,
  type PlayerGender,
  type StreetType,
} from "@/lib/roster/constants";
import { docsDeliveredAtToInput } from "@/lib/roster/onboarding";
import type { PlayerContact, PlayerWithDetails } from "@/lib/types/db";

export const PLAYER_EXPORT_MAX_ROWS = 500;

export type PlayerExportFieldId =
  | "first_name"
  | "last_name"
  | "birth_date"
  | "dni"
  | "gender"
  | "birth_country"
  | "nationality"
  | "team"
  | "season"
  | "is_active"
  | "clothing_size"
  | "pays_extended_monthly"
  | "address_street_type"
  | "address_street"
  | "address_number"
  | "address_door"
  | "address_postal_code"
  | "address_municipality"
  | "address_province"
  | "address"
  | "phone"
  | "email"
  | "contact_name"
  | "contact_relationship"
  | "contact_phone"
  | "contact_email"
  | "contact2_name"
  | "contact2_relationship"
  | "contact2_phone"
  | "contact2_email"
  | "docs_delivered_to_family"
  | "docs_delivered_at"
  | "registration_papers_received"
  | "photo_taken"
  | "license_completed"
  | "in_whatsapp_group"
  | "photo_consent"
  | "medical_notes";

export type PlayerExportFieldGroup =
  | "identity"
  | "club"
  | "address"
  | "contact"
  | "checklist"
  | "other";

export type PlayerExportField = {
  id: PlayerExportFieldId;
  label: string;
  group: PlayerExportFieldGroup;
  defaultSelected: boolean;
};

export const PLAYER_EXPORT_GROUP_LABELS: Record<PlayerExportFieldGroup, string> = {
  identity: "Identidad",
  club: "Club",
  address: "Domicilio",
  contact: "Contacto",
  checklist: "Alta",
  other: "Otros",
};

export const PLAYER_EXPORT_FIELDS: readonly PlayerExportField[] = [
  { id: "first_name", label: "Nombre", group: "identity", defaultSelected: true },
  { id: "last_name", label: "Apellidos", group: "identity", defaultSelected: true },
  { id: "birth_date", label: "Fecha de nacimiento", group: "identity", defaultSelected: true },
  { id: "dni", label: "DNI / NIE", group: "identity", defaultSelected: true },
  { id: "gender", label: "Sexo", group: "identity", defaultSelected: true },
  { id: "birth_country", label: "País de nacimiento", group: "identity", defaultSelected: false },
  { id: "nationality", label: "Nacionalidad", group: "identity", defaultSelected: false },
  { id: "team", label: "Equipo principal", group: "club", defaultSelected: true },
  { id: "season", label: "Temporada", group: "club", defaultSelected: false },
  { id: "is_active", label: "Activo", group: "club", defaultSelected: false },
  { id: "clothing_size", label: "Talla", group: "club", defaultSelected: false },
  { id: "pays_extended_monthly", label: "Cuota ampliada", group: "club", defaultSelected: false },
  { id: "address_street_type", label: "Tipo de vía", group: "address", defaultSelected: false },
  { id: "address_street", label: "Vía", group: "address", defaultSelected: false },
  { id: "address_number", label: "Número", group: "address", defaultSelected: false },
  { id: "address_door", label: "Piso / puerta", group: "address", defaultSelected: false },
  { id: "address_postal_code", label: "Código postal", group: "address", defaultSelected: false },
  { id: "address_municipality", label: "Municipio", group: "address", defaultSelected: false },
  { id: "address_province", label: "Provincia", group: "address", defaultSelected: false },
  { id: "address", label: "Dirección", group: "address", defaultSelected: false },
  { id: "phone", label: "Teléfono", group: "contact", defaultSelected: true },
  { id: "email", label: "Email", group: "contact", defaultSelected: true },
  { id: "contact_name", label: "Contacto nombre", group: "contact", defaultSelected: false },
  {
    id: "contact_relationship",
    label: "Contacto parentesco",
    group: "contact",
    defaultSelected: false,
  },
  { id: "contact_phone", label: "Contacto teléfono", group: "contact", defaultSelected: false },
  { id: "contact_email", label: "Contacto email", group: "contact", defaultSelected: false },
  { id: "contact2_name", label: "Contacto 2 nombre", group: "contact", defaultSelected: false },
  {
    id: "contact2_relationship",
    label: "Contacto 2 parentesco",
    group: "contact",
    defaultSelected: false,
  },
  { id: "contact2_phone", label: "Contacto 2 teléfono", group: "contact", defaultSelected: false },
  { id: "contact2_email", label: "Contacto 2 email", group: "contact", defaultSelected: false },
  {
    id: "docs_delivered_to_family",
    label: "Docs entregados",
    group: "checklist",
    defaultSelected: false,
  },
  {
    id: "docs_delivered_at",
    label: "Fecha de entrega de docs",
    group: "checklist",
    defaultSelected: false,
  },
  {
    id: "registration_papers_received",
    label: "Papeles recibidos",
    group: "checklist",
    defaultSelected: false,
  },
  { id: "photo_taken", label: "Foto hecha", group: "checklist", defaultSelected: false },
  {
    id: "license_completed",
    label: "Licencia realizada",
    group: "checklist",
    defaultSelected: false,
  },
  {
    id: "in_whatsapp_group",
    label: "En grupo WhatsApp",
    group: "checklist",
    defaultSelected: false,
  },
  { id: "photo_consent", label: "Autoriza fotos", group: "checklist", defaultSelected: false },
  {
    id: "medical_notes",
    label: "Enfermedades o patologías detectadas",
    group: "other",
    defaultSelected: false,
  },
] as const;

export const PLAYER_EXPORT_FIELD_IDS = PLAYER_EXPORT_FIELDS.map((field) => field.id);

export const DEFAULT_PLAYER_EXPORT_FIELD_IDS: PlayerExportFieldId[] = PLAYER_EXPORT_FIELDS.filter(
  (field) => field.defaultSelected,
).map((field) => field.id);

export type PlayerExportScope = "selected" | "filtered" | "season";

function yesNo(value: boolean): string {
  return value ? "Sí" : "No";
}

function isoDateToCsv(iso: string | null | undefined): string {
  if (!iso) return "";
  // birth_date is YYYY-MM-DD; docs_delivered_at is timestamptz.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [year, month, day] = iso.split("-");
    return `${day}/${month}/${year}`;
  }
  const input = docsDeliveredAtToInput(iso);
  if (!input) return "";
  const [year, month, day] = input.split("-");
  return `${day}/${month}/${year}`;
}

function streetTypeLabel(value: string | null): string {
  if (!value) return "";
  return STREET_TYPE_LABELS[value as StreetType] ?? value;
}

function relationshipLabel(value: string | null | undefined): string {
  if (!value) return "";
  return CONTACT_RELATIONSHIP_LABELS[value as ContactRelationship] ?? value;
}

function orderedContacts(contacts: PlayerContact[]): [PlayerContact | null, PlayerContact | null] {
  const sorted = [...contacts].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  return [sorted[0] ?? null, sorted[1] ?? null];
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function resolvePlayerExportFields(fieldIds: readonly string[]): PlayerExportField[] {
  const allowed = new Set<string>(PLAYER_EXPORT_FIELD_IDS);
  const seen = new Set<string>();
  const ordered: PlayerExportField[] = [];

  for (const id of fieldIds) {
    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    const field = PLAYER_EXPORT_FIELDS.find((item) => item.id === id);
    if (field) ordered.push(field);
  }

  return ordered;
}

function cellForField(
  field: PlayerExportField,
  player: PlayerWithDetails,
  primary: PlayerContact | null,
  secondary: PlayerContact | null,
): string {
  switch (field.id) {
    case "first_name":
      return player.first_name;
    case "last_name":
      return player.last_name;
    case "birth_date":
      return isoDateToCsv(player.birth_date);
    case "dni":
      return player.dni ?? "";
    case "gender":
      return player.gender
        ? (PLAYER_GENDER_LABELS[player.gender as PlayerGender] ?? player.gender)
        : "";
    case "birth_country":
      return player.birth_country ?? "";
    case "nationality":
      return player.nationality ?? "";
    case "team":
      return player.team
        ? `${player.team.name} · ${formatTeamCategory(player.team.category)}`
        : "Sin equipo";
    case "season":
      return player.season;
    case "is_active":
      return yesNo(player.is_active);
    case "clothing_size":
      return player.clothing_size ? formatClothingSize(player.clothing_size) : "";
    case "pays_extended_monthly":
      return yesNo(player.pays_extended_monthly);
    case "address_street_type":
      return streetTypeLabel(player.address_street_type);
    case "address_street":
      return player.address_street ?? "";
    case "address_number":
      return player.address_number ?? "";
    case "address_door":
      return player.address_door ?? "";
    case "address_postal_code":
      return player.address_postal_code ?? "";
    case "address_municipality":
      return player.address_municipality ?? "";
    case "address_province":
      return player.address_province ?? "";
    case "address":
      return (
        player.address?.trim() ||
        formatPlayerAddress({
          street_type: player.address_street_type,
          street: player.address_street,
          number: player.address_number,
          door: player.address_door,
          postal_code: player.address_postal_code,
          municipality: player.address_municipality,
          province: player.address_province,
        }) ||
        ""
      );
    case "phone":
      return primary?.phone?.trim() || "";
    case "email":
      return primary?.email?.trim() || "";
    case "contact_name":
      return primary?.full_name ?? "";
    case "contact_relationship":
      return relationshipLabel(primary?.relationship);
    case "contact_phone":
      return primary?.phone?.trim() || "";
    case "contact_email":
      return primary?.email?.trim() || "";
    case "contact2_name":
      return secondary?.full_name ?? "";
    case "contact2_relationship":
      return relationshipLabel(secondary?.relationship);
    case "contact2_phone":
      return secondary?.phone?.trim() || "";
    case "contact2_email":
      return secondary?.email?.trim() || "";
    case "docs_delivered_to_family":
      return yesNo(player.docs_delivered_to_family);
    case "docs_delivered_at":
      return isoDateToCsv(player.docs_delivered_at);
    case "registration_papers_received":
      return yesNo(player.registration_papers_received);
    case "photo_taken":
      return yesNo(player.photo_taken);
    case "license_completed":
      return yesNo(player.license_completed);
    case "in_whatsapp_group":
      return yesNo(player.in_whatsapp_group);
    case "photo_consent":
      return yesNo(player.photo_consent);
    case "medical_notes":
      return player.medical_notes ?? "";
    default: {
      const _exhaustive: never = field.id;
      return _exhaustive;
    }
  }
}

export function buildPlayersCsv(
  players: PlayerWithDetails[],
  fieldIds: readonly string[],
): string {
  const fields = resolvePlayerExportFields(fieldIds);
  if (fields.length === 0) {
    throw new Error("Elige al menos un campo para exportar");
  }

  const header = fields.map((field) => escapeCsvCell(field.label)).join(",");
  const rows = players.map((player) => {
    const [primary, secondary] = orderedContacts(player.contacts);
    return fields
      .map((field) => escapeCsvCell(cellForField(field, player, primary, secondary)))
      .join(",");
  });

  return `\uFEFF${[header, ...rows].join("\r\n")}\r\n`;
}

export function playerExportFilename(season: string): string {
  const safeSeason = season.replace(/[^\w.-]+/g, "_");
  return `CVOrotava-jugadores-${safeSeason}.csv`;
}
