import { contactsForPlayerAge, usesSelfContact } from "@/lib/roster/age";
import {
  TEAM_CATEGORIES,
  TEAM_CATEGORY_LABELS,
  TEAM_GENDER_LABELS,
  type ContactRelationship,
  type TeamCategory,
  type TeamGender,
} from "@/lib/roster/constants";
import {
  isNieDocument,
  isSpanishNationality,
  isValidDniOrNie,
  normalizeDocumentId,
} from "@/lib/roster/document";
import { parseFederationAddress } from "@/lib/roster/parse-federation-address";
import type { PlayerWriteInput } from "@/lib/roster/repository/players";
import { isValidEmail, isValidPhone, birthDateValidationMessage } from "@/lib/roster/validators";
import type { Team } from "@/lib/types/db";

export const FEDERATION_IMPORT_MAX_ROWS = 500;

/** Cabeceras del CSV de licencias Federación Canaria (UTF-8 BOM). */
export const FEDERATION_CSV_HEADERS = [
  "Tipo licencia",
  "Temporada",
  "Nombre",
  "Apellidos",
  "Segundo Apellido",
  "Fecha nacimiento",
  "Documento identidad",
  "Número de documento (si no es NIF)  *",
  "País de Nacimiento",
  "Nacionalidad",
  "Domicilio",
  "Dirección",
  "Código Postal",
  "Localidad",
  "Isla",
  "Provincia",
  "Telf. móvil",
  "Correo electrónico",
  "Nombre y Apellidos Padre/Madre/Tutor Legal",
  "Categoría",
  "Sexo",
  "Fecha revisión licencia",
  "Fecha validación licencia",
] as const;

export type FederationCsvHeader = (typeof FEDERATION_CSV_HEADERS)[number];

export type FederationDiscardReason =
  | "no_jugador"
  | "otra_temporada"
  | "dni_invalido"
  | "dni_vacio"
  | "dni_duplicado_archivo"
  | "dni_duplicado_temporada"
  | "identidad_duplicada_temporada"
  | "documento_extranjero"
  | "fila_invalida"
  | "sin_identidad";

export const FEDERATION_DISCARD_LABELS: Record<FederationDiscardReason, string> = {
  no_jugador: "No es licencia de jugador",
  otra_temporada: "Otra temporada",
  dni_invalido: "DNI/NIE no válido",
  dni_vacio: "Sin DNI/NIE",
  dni_duplicado_archivo: "DNI repetido en el archivo",
  dni_duplicado_temporada: "Ya existe en esta temporada",
  identidad_duplicada_temporada:
    "Ya existe en esta temporada (mismo nombre y fecha; el CSV no trae el mismo documento)",
  documento_extranjero: "Documento extranjero no validable",
  fila_invalida: "Fila CSV no válida",
  sin_identidad: "Faltan nombre, apellidos o fecha de nacimiento",
};

export type FederationTeamKey = {
  category: TeamCategory;
  gender: TeamGender;
  name: string;
};

export type FederationImportRowPreview = {
  row: number;
  label: string;
  dni: string;
  teamName: string | null;
  teamKey: FederationTeamKey | null;
  incomplete: boolean;
  missingFields: string[];
  input: PlayerWriteInput;
  /** Espejo de checklist / domicilio para UI y tests (también en `input`). */
  license_completed: boolean;
  registration_papers_received: boolean;
  docs_delivered_to_family: boolean;
  docs_delivered_at: string | null;
  photo_taken: boolean;
  photo_consent: boolean;
  in_whatsapp_group: boolean;
  birth_country: string | null;
  nationality: string | null;
  address: string | null;
  address_street_type: string | null;
  address_street: string | null;
  address_number: string | null;
  address_municipality: string | null;
  address_province: string | null;
  address_postal_code: string | null;
};

export type FederationDiscardedRow = {
  row: number;
  label: string;
  reason: FederationDiscardReason;
  reasonLabel: string;
  detail?: string;
};

export type FederationImportParseResult = {
  toImport: FederationImportRowPreview[];
  discarded: FederationDiscardedRow[];
  incomplete: FederationImportRowPreview[];
  teamsToCreate: FederationTeamKey[];
  counts: {
    toImport: number;
    discarded: number;
    incomplete: number;
    teamsToCreate: number;
  };
};

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function cellText(value: string | undefined | null): string {
  return (value ?? "").trim();
}

/**
 * Normaliza tokens de temporada para comparar portal (`2026-27`) con CSV
 * (`Temporada 2026-2027 Voleibol`).
 */
export function normalizeSeasonToken(value: string): string {
  return fold(value).replace(/\s+/g, "");
}

/** Expande `2026-27` → variantes `2026-27` y `2026-2027`. */
export function seasonIdMatchTokens(seasonId: string): string[] {
  const raw = seasonId.trim();
  const short = /^(\d{4})-(\d{2})$/.exec(raw);
  if (short) {
    const start = short[1]!;
    const endShort = short[2]!;
    const endFull = `${start.slice(0, 2)}${endShort}`;
    return [`${start}-${endShort}`, `${start}-${endFull}`].map(normalizeSeasonToken);
  }
  const full = /^(\d{4})-(\d{4})$/.exec(raw);
  if (full) {
    const start = full[1]!;
    const end = full[2]!;
    return [`${start}-${end.slice(-2)}`, `${start}-${end}`].map(normalizeSeasonToken);
  }
  return [normalizeSeasonToken(raw)].filter(Boolean);
}

export function federationSeasonMatches(csvSeason: string, seasonId: string): boolean {
  const haystack = normalizeSeasonToken(csvSeason);
  if (!haystack) return false;
  return seasonIdMatchTokens(seasonId).some((token) => token && haystack.includes(token));
}

const NATIONALITY_BY_ISO: Record<string, string> = {
  ve: "Venezuela",
  co: "Colombia",
  ar: "Argentina",
  uy: "Uruguay",
  py: "Paraguay",
  bo: "Bolivia",
  pe: "Perú",
  ec: "Ecuador",
  cl: "Chile",
  mx: "México",
  cu: "Cuba",
  do: "República Dominicana",
  gt: "Guatemala",
  hn: "Honduras",
  sv: "El Salvador",
  ni: "Nicaragua",
  pa: "Panamá",
  cr: "Costa Rica",
  br: "Brasil",
  pt: "Portugal",
  it: "Italia",
  fr: "Francia",
  de: "Alemania",
  gb: "Reino Unido",
  uk: "Reino Unido",
  us: "Estados Unidos",
  ma: "Marruecos",
  sn: "Senegal",
  ng: "Nigeria",
  cn: "China",
  jp: "Japón",
  ru: "Rusia",
  ua: "Ucrania",
  pl: "Polonia",
  ro: "Rumanía",
  bg: "Bulgaria",
  lv: "Letonia",
  lt: "Lituania",
  ee: "Estonia",
  nl: "Países Bajos",
  be: "Bélgica",
  ch: "Suiza",
  at: "Austria",
  ie: "Irlanda",
  se: "Suecia",
  no: "Noruega",
  dk: "Dinamarca",
  fi: "Finlandia",
  gr: "Grecia",
  tr: "Turquía",
  mauritania: "Mauritania",
};

export function mapFederationNationality(raw: string | null | undefined): string | undefined {
  const value = cellText(raw);
  if (!value) return undefined;
  if (isSpanishNationality(value) || fold(value) === "es") return undefined;
  const iso = fold(value);
  if (NATIONALITY_BY_ISO[iso]) return NATIONALITY_BY_ISO[iso];
  // Etiqueta ya en texto (no ISO de 2 letras)
  if (value.length > 2 && !/^[a-z]{2}$/i.test(value)) {
    return isSpanishNationality(value) ? undefined : value;
  }
  return undefined;
}

export function mapFederationCategory(raw: string | null | undefined): TeamCategory | null {
  const value = fold(raw ?? "").replace(/voleibol/g, "").trim();
  if (!value) return null;
  const aliases: Record<string, TeamCategory> = {
    minivoley: "minivoley",
    mini: "minivoley",
    benjamin: "benjamin",
    alevin: "alevin",
    infantil: "infantil",
    cadete: "cadete",
    juvenil: "juvenil",
    junior: "junior",
    senior: "senior",
  };
  if (value in aliases) return aliases[value]!;
  return TEAM_CATEGORIES.find((cat) => fold(TEAM_CATEGORY_LABELS[cat]) === value) ?? null;
}

export function mapFederationGender(raw: string | null | undefined): TeamGender | null {
  const value = fold(raw ?? "");
  if (value === "femenino" || value === "female" || value === "f" || value === "mujer") return "female";
  if (value === "masculino" || value === "male" || value === "m" || value === "hombre") return "male";
  return null;
}

export function federationBaseTeamName(
  categoryOrCsv: TeamCategory | string,
  genderOrSex: TeamGender | string,
): string | null {
  if (
    (TEAM_CATEGORIES as readonly string[]).includes(categoryOrCsv) &&
    (genderOrSex === "male" || genderOrSex === "female")
  ) {
    return `${TEAM_CATEGORY_LABELS[categoryOrCsv as TeamCategory]} ${TEAM_GENDER_LABELS[genderOrSex]}`;
  }
  return buildFederationTeamKey(categoryOrCsv, genderOrSex)?.name ?? null;
}

export function mapFederationBaseTeam(
  categoryCsv: string,
  sexCsv: string,
): FederationTeamKey | null {
  return buildFederationTeamKey(categoryCsv, sexCsv);
}

/** Checklist fijo al confirmar (nunca copiar derechos de imagen del CSV). */
export const FEDERATION_CHECKLIST_DEFAULTS = {
  license_completed: true,
  registration_papers_received: true,
  docs_delivered_to_family: true,
  photo_taken: true,
  photo_consent: false,
  in_whatsapp_group: false,
} as const;

export function federationChecklistDefaults(dates?: {
  revision?: string | null;
  validation?: string | null;
}): typeof FEDERATION_CHECKLIST_DEFAULTS & { docs_delivered_at: string | null } {
  return {
    ...FEDERATION_CHECKLIST_DEFAULTS,
    docs_delivered_at:
      parseFederationDocsDate(dates?.revision) ?? parseFederationDocsDate(dates?.validation),
  };
}

export function confirmRequiresIncompleteAck(preview: { incomplete: unknown[] }): boolean {
  return preview.incomplete.length > 0;
}

export function buildFederationTeamKey(
  categoryRaw: string,
  genderRaw: string,
): FederationTeamKey | null {
  const category = mapFederationCategory(categoryRaw);
  const gender = mapFederationGender(genderRaw);
  if (!category || !gender) return null;
  return {
    category,
    gender,
    name: `${TEAM_CATEGORY_LABELS[category]} ${TEAM_GENDER_LABELS[gender]}`,
  };
}

function parseIsoDate(raw: string): string | null | "invalid" {
  const value = raw.trim();
  if (!value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) {
    const date = `${iso[1]}-${iso[2]}-${iso[3]}`;
    return birthDateValidationMessage(date) ? "invalid" : date;
  }
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value);
  if (dmy) {
    const day = dmy[1]!.padStart(2, "0");
    const month = dmy[2]!.padStart(2, "0");
    const date = `${dmy[3]}-${month}-${day}`;
    return birthDateValidationMessage(date) ? "invalid" : date;
  }
  return "invalid";
}

/** Fecha de docs: ISO date si parsea; si no, null (sin inventar). */
export function parseFederationDocsDate(raw: string | null | undefined): string | null {
  const value = cellText(raw);
  if (!value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value);
  if (dmy) {
    return `${dmy[3]}-${dmy[2]!.padStart(2, "0")}-${dmy[1]!.padStart(2, "0")}`;
  }
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    const date = new Date(parsed);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return null;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    const next = text[i + 1];
    if (inQuotes) {
      if (c === '"') {
        if (next === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (c === "\r") {
      continue;
    }
    cell += c;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((value) => value.trim()));
}

function mapHeader(raw: string): FederationCsvHeader | null {
  const folded = fold(raw).replace(/\*+$/, "").trim();
  const aliases: Record<string, FederationCsvHeader> = {
    "tipo licencia": "Tipo licencia",
    temporada: "Temporada",
    nombre: "Nombre",
    apellidos: "Apellidos",
    "segundo apellido": "Segundo Apellido",
    "fecha nacimiento": "Fecha nacimiento",
    "documento identidad": "Documento identidad",
    "numero de documento (si no es nif)": "Número de documento (si no es NIF)  *",
    "pais de nacimiento": "País de Nacimiento",
    nacionalidad: "Nacionalidad",
    domicilio: "Domicilio",
    direccion: "Dirección",
    "codigo postal": "Código Postal",
    localidad: "Localidad",
    isla: "Isla",
    provincia: "Provincia",
    "telf. movil": "Telf. móvil",
    "tel. movil": "Telf. móvil",
    "telefono movil": "Telf. móvil",
    "correo electronico": "Correo electrónico",
    "nombre y apellidos padre/madre/tutor legal": "Nombre y Apellidos Padre/Madre/Tutor Legal",
    categoria: "Categoría",
    sexo: "Sexo",
    "fecha revision licencia": "Fecha revisión licencia",
    "fecha validacion licencia": "Fecha validación licencia",
  };
  if (folded in aliases) return aliases[folded]!;
  return FEDERATION_CSV_HEADERS.find((header) => fold(header).replace(/\*+$/, "").trim() === folded) ?? null;
}

function isDocumentTypeToken(value: string): boolean {
  const folded = fold(value).replace(/[^a-z]/g, "");
  return (
    folded === "nif" ||
    folded === "nie" ||
    folded === "dni" ||
    folded === "pasaporte" ||
    folded === "passport" ||
    folded === "cif" ||
    folded === "documento" ||
    folded === "doc"
  );
}

function looksLikeInvalidSpanishId(id: string): boolean {
  return /^\d{8}[A-Z]$/.test(id) || /^[XYZ]\d{7}[A-Z]$/.test(id);
}

/**
 * Prioridad (columnas Federación):
 * 1. DNI/NIE válido en primaria o en «si no es NIF»
 * 2. Si primaria no es DNI/NIE válido y hay valor usable en fallback → fallback
 *    (evita quedarnos con un ID numérico de licencia/perfil y tirar el NIE/pasaporte)
 * 3. Patrón ES mal formado → dni_invalido
 * 4. Cualquier otro no vacío → identificador extranjero (cédula, pasaporte…)
 *
 * Nota CSV real: en extranjeros a menudo `Documento identidad` viene vacío y el
 * número (NIE, cédula…) solo en «Número de documento (si no es NIF)». No es el
 * «ID licencia» del export (columna aparte que no usamos como dni).
 */
function resolveDocument(primary: string, fallback: string): {
  dni: string | null;
  discard?: FederationDiscardReason;
} {
  const rawPrimary = primary.trim() && !isDocumentTypeToken(primary) ? primary.trim() : "";
  const rawFallback = fallback.trim() && !isDocumentTypeToken(fallback) ? fallback.trim() : "";
  const main = rawPrimary ? normalizeDocumentId(rawPrimary) : "";
  const alt = rawFallback ? normalizeDocumentId(rawFallback) : "";

  if (main && isValidDniOrNie(main)) return { dni: main };
  if (alt && isValidDniOrNie(alt)) return { dni: alt };

  // Primaria no es DNI/NIE: la columna «si no es NIF» es la fuente preferida.
  if (alt) {
    if (looksLikeInvalidSpanishId(alt)) {
      return { dni: null, discard: "dni_invalido" };
    }
    return { dni: alt };
  }

  if (main) {
    if (looksLikeInvalidSpanishId(main)) {
      return { dni: null, discard: "dni_invalido" };
    }
    return { dni: main };
  }

  return { dni: null, discard: "dni_vacio" };
}

/** Clave estable nombre+fecha para detectar la misma persona con distinto documento. */
export function federationIdentityKey(
  firstName: string,
  lastName: string,
  birthDate: string,
): string {
  return `${fold(firstName)}|${fold(lastName)}|${birthDate.trim()}`;
}

/**
 * ¿El documento del CSV ya está en temporada?
 * Incluye NIE truncado sin letra (`Y8872640`) vs NIE completo en portal (`Y8872640X`).
 */
export function federationDocumentAlreadyExists(
  dni: string,
  existingDnis: ReadonlySet<string>,
): boolean {
  if (existingDnis.has(dni)) return true;
  if (/^[XYZ]\d{7}$/.test(dni)) {
    for (const existing of existingDnis) {
      if (existing.startsWith(dni) && /^[XYZ]\d{7}[A-Z]$/.test(existing)) return true;
    }
  }
  if (/^[XYZ]\d{7}[A-Z]$/.test(dni)) {
    if (existingDnis.has(dni.slice(0, 8))) return true;
  }
  return false;
}

function titleLabel(firstName: string, lastName: string, row: number): string {
  const name = `${firstName} ${lastName}`.trim();
  return name || `Fila ${row}`;
}

function discard(
  row: number,
  label: string,
  reason: FederationDiscardReason,
  detail?: string,
): FederationDiscardedRow {
  return {
    row,
    label,
    reason,
    reasonLabel: FEDERATION_DISCARD_LABELS[reason],
    detail,
  };
}

function buildContacts(input: {
  birthDate: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  tutorName: string;
  teamCategory?: string | null;
}): { contacts: PlayerWriteInput["contacts"]; missingFields: string[] } {
  const missingFields: string[] = [];
  const phone = input.mobile && isValidPhone(input.mobile) ? input.mobile.replace(/[\s().-]/g, "") : "";
  const email = input.email && isValidEmail(input.email) ? input.email.trim() : "";
  if (input.mobile && !phone) missingFields.push("Teléfono");
  if (input.email && !email) missingFields.push("Email");

  const selfContact = usesSelfContact({
    birthDate: input.birthDate,
    teamCategory: input.teamCategory,
  });

  if (selfContact) {
    if (!phone) missingFields.push("Teléfono");
    if (!email) missingFields.push("Email");
    const contacts = contactsForPlayerAge({
      birthDate: input.birthDate,
      firstName: input.firstName,
      lastName: input.lastName,
      teamCategory: input.teamCategory,
      contacts: [
        {
          full_name: `${input.firstName} ${input.lastName}`.trim(),
          relationship: "jugador" as ContactRelationship,
          phone: phone || undefined,
          email: email || undefined,
          is_primary: true,
        },
      ],
    });
    return { contacts, missingFields: [...new Set(missingFields)] };
  }

  const tutor = input.tutorName.trim();
  if (!tutor) missingFields.push("Contacto (tutor)");
  if (!phone) missingFields.push("Teléfono del contacto");
  if (!email) missingFields.push("Email del contacto");

  // Sin nombre de tutor no inventamos el contacto (pesimismo).
  if (!tutor) {
    return { contacts: [], missingFields: [...new Set(missingFields)] };
  }

  const contacts = contactsForPlayerAge({
    birthDate: input.birthDate,
    firstName: input.firstName,
    lastName: input.lastName,
    teamCategory: input.teamCategory,
    contacts: [
      {
        full_name: tutor,
        relationship: "madre" as ContactRelationship,
        phone: phone || undefined,
        email: email || undefined,
        is_primary: true,
      },
    ],
  });

  return { contacts, missingFields: [...new Set(missingFields)] };
}

export type ParseFederationImportOptions = {
  season?: string;
  /** Alias de `season` (contrato tests / UI). */
  seasonId?: string;
  /** DNIs ya existentes en la temporada (normalizados). */
  existingDnis?: ReadonlySet<string>;
  /**
   * Identidades ya en temporada (`federationIdentityKey`).
   * Evita duplicar extranjeros cuando el CSV trae cédula/pasaporte y el portal el NIE.
   */
  existingIdentities?: ReadonlySet<string>;
  /** Equipos actuales de la temporada (para teamsToCreate). */
  teams?: Team[];
};

/**
 * Parsea CSV de licencias Federación Canaria (UTF-8 con o sin BOM).
 * Pesimista: duda en un campo → null/vacío + missingFields; descarta fila solo por reglas duras.
 */
export function parseFederationImportCsv(
  bytes: ArrayBuffer | Buffer | Uint8Array | string,
  options: ParseFederationImportOptions,
): FederationImportParseResult {
  const season = options.season || options.seasonId;
  if (!season) {
    return {
      toImport: [],
      discarded: [discard(0, "Archivo", "fila_invalida", "Falta temporada del portal")],
      incomplete: [],
      teamsToCreate: [],
      counts: { toImport: 0, discarded: 1, incomplete: 0, teamsToCreate: 0 },
    };
  }
  return parseFederationImportCsvWithSeason(bytes, { ...options, season });
}

/** Alias estable para UI/tests. */
export function parseFederationImport(
  bytes: ArrayBuffer | Buffer | Uint8Array | string,
  options: ParseFederationImportOptions | { seasonId: string; existingDnis?: ReadonlySet<string>; teams?: Team[] },
): FederationImportParseResult {
  const season =
    "season" in options && options.season
      ? options.season
      : "seasonId" in options
        ? options.seasonId
        : "";
  return parseFederationImportCsv(bytes, { ...options, season });
}

function parseFederationImportCsvWithSeason(
  bytes: ArrayBuffer | Buffer | Uint8Array | string,
  options: ParseFederationImportOptions & { season: string },
): FederationImportParseResult {
  const raw =
    typeof bytes === "string"
      ? bytes
      : new TextDecoder("utf-8").decode(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  const text = raw.replace(/^\uFEFF/, "");
  const table = parseCsv(text);
  const headerRow = table[0] ?? [];
  const columns = headerRow.map((header) => mapHeader(header));

  const toImport: FederationImportRowPreview[] = [];
  const discarded: FederationDiscardedRow[] = [];
  const seenDni = new Set<string>();
  const seenIdentities = new Set<string>();
  const existingDnis = options.existingDnis ?? new Set<string>();
  const existingIdentities = options.existingIdentities ?? new Set<string>();

  if (
    !columns.includes("Tipo licencia") ||
    !columns.includes("Temporada") ||
    !columns.includes("Nombre") ||
    !columns.includes("Documento identidad")
  ) {
    return {
      toImport: [],
      discarded: [
        discard(1, "Archivo", "fila_invalida", "Faltan columnas obligatorias del CSV federativo"),
      ],
      incomplete: [],
      teamsToCreate: [],
      counts: { toImport: 0, discarded: 1, incomplete: 0, teamsToCreate: 0 },
    };
  }

  const dataRows = table.slice(1);
  if (dataRows.length > FEDERATION_IMPORT_MAX_ROWS) {
    return {
      toImport: [],
      discarded: [
        discard(
          0,
          "Archivo",
          "fila_invalida",
          `El archivo tiene ${dataRows.length} filas. El máximo es ${FEDERATION_IMPORT_MAX_ROWS}.`,
        ),
      ],
      incomplete: [],
      teamsToCreate: [],
      counts: { toImport: 0, discarded: 1, incomplete: 0, teamsToCreate: 0 },
    };
  }

  const get = (cells: string[], header: FederationCsvHeader) => {
    const col = columns.indexOf(header);
    return col >= 0 ? cellText(cells[col]) : "";
  };

  dataRows.forEach((cells, index) => {
    const row = index + 2;
    const firstName = get(cells, "Nombre");
    const lastName = [get(cells, "Apellidos"), get(cells, "Segundo Apellido")]
      .filter(Boolean)
      .join(" ")
      .trim();
    const label = titleLabel(firstName, lastName, row);

    const empty = columns.every((header, col) => !header || !cellText(cells[col]));
    if (empty) return;

    const licenseType = fold(get(cells, "Tipo licencia"));
    if (licenseType !== "jugador") {
      discarded.push(discard(row, label, "no_jugador", get(cells, "Tipo licencia") || undefined));
      return;
    }

    const csvSeason = get(cells, "Temporada");
    if (!federationSeasonMatches(csvSeason, options.season)) {
      discarded.push(discard(row, label, "otra_temporada", csvSeason || undefined));
      return;
    }

    if (!firstName || !lastName) {
      discarded.push(discard(row, label, "sin_identidad"));
      return;
    }

    const birthRaw = parseIsoDate(get(cells, "Fecha nacimiento"));
    if (!birthRaw || birthRaw === "invalid") {
      discarded.push(discard(row, label, "sin_identidad", "Fecha de nacimiento no válida"));
      return;
    }

    const doc = resolveDocument(
      get(cells, "Documento identidad"),
      get(cells, "Número de documento (si no es NIF)  *"),
    );
    if (!doc.dni) {
      discarded.push(discard(row, label, doc.discard ?? "dni_vacio"));
      return;
    }

    if (seenDni.has(doc.dni) || federationDocumentAlreadyExists(doc.dni, seenDni)) {
      discarded.push(discard(row, label, "dni_duplicado_archivo", doc.dni));
      return;
    }
    if (federationDocumentAlreadyExists(doc.dni, existingDnis)) {
      discarded.push(discard(row, label, "dni_duplicado_temporada", doc.dni));
      return;
    }

    const identityKey = federationIdentityKey(firstName, lastName, birthRaw);
    if (seenIdentities.has(identityKey)) {
      discarded.push(
        discard(row, label, "dni_duplicado_archivo", `misma identidad que otra fila (${doc.dni})`),
      );
      return;
    }
    if (existingIdentities.has(identityKey)) {
      discarded.push(discard(row, label, "identidad_duplicada_temporada", doc.dni));
      return;
    }

    seenDni.add(doc.dni);
    seenIdentities.add(identityKey);

    const missingFields: string[] = [];
    const teamKey = buildFederationTeamKey(get(cells, "Categoría"), get(cells, "Sexo"));
    if (!teamKey) {
      missingFields.push("Equipo (categoría/sexo)");
    }

    let birth_country: string | undefined;
    let nationality: string | undefined;
    const paisNacimiento = cellText(get(cells, "País de Nacimiento"));
    const nationalityRaw = get(cells, "Nacionalidad");
    const isForeignDocument = !isValidDniOrNie(doc.dni);

    if (isNieDocument(doc.dni) || isForeignDocument) {
      if (paisNacimiento && !isSpanishNationality(paisNacimiento) && fold(paisNacimiento) !== "espana") {
        birth_country = paisNacimiento;
      } else if (paisNacimiento && (isSpanishNationality(paisNacimiento) || fold(paisNacimiento) === "espana")) {
        birth_country = "España";
      } else {
        missingFields.push("País de nacimiento");
      }
      nationality = mapFederationNationality(nationalityRaw);
      if (nationalityRaw && !nationality && fold(nationalityRaw) !== "es") {
        missingFields.push("Nacionalidad");
      }
      if (isForeignDocument) {
        missingFields.push("DNI/NIE español (documento extranjero)");
      }
    } else {
      // DNI español: no guardar país/nacionalidad federativos (País ≠ nacionalidad; es → vacío)
      birth_country = undefined;
      nationality = undefined;
    }

    const address = parseFederationAddress({
      domicilio: get(cells, "Domicilio"),
      direccion: get(cells, "Dirección"),
      postalCode: get(cells, "Código Postal"),
      localidad: get(cells, "Localidad"),
      isla: get(cells, "Isla"),
      provincia: get(cells, "Provincia"),
    });
    missingFields.push(...address.missingFields);

    const { contacts, missingFields: contactMissing } = buildContacts({
      birthDate: birthRaw,
      firstName,
      lastName,
      mobile: get(cells, "Telf. móvil"),
      email: get(cells, "Correo electrónico"),
      tutorName: get(cells, "Nombre y Apellidos Padre/Madre/Tutor Legal"),
      teamCategory: teamKey?.category,
    });
    missingFields.push(...contactMissing);

    const docsDate =
      parseFederationDocsDate(get(cells, "Fecha revisión licencia")) ??
      parseFederationDocsDate(get(cells, "Fecha validación licencia"));

    const uniqueMissing = [...new Set(missingFields)];
    const incomplete = uniqueMissing.length > 0;

    const input: PlayerWriteInput = {
      first_name: firstName,
      last_name: lastName,
      birth_date: birthRaw,
      dni: doc.dni,
      season: options.season,
      team_id: null,
      birth_country: birth_country ?? null,
      nationality: nationality ?? null,
      address: address.structured ? null : address.address ?? null,
      address_street_type: address.street_type ?? null,
      address_street: address.street ?? null,
      address_number: address.number ?? null,
      address_door: address.door ?? null,
      address_postal_code: address.postal_code ?? null,
      address_municipality: address.municipality ?? null,
      address_province: address.province ?? null,
      ...FEDERATION_CHECKLIST_DEFAULTS,
      docs_delivered_at: docsDate,
      contacts,
    };

    toImport.push({
      row,
      label,
      dni: doc.dni,
      teamName: teamKey?.name ?? null,
      teamKey,
      incomplete,
      missingFields: uniqueMissing,
      input,
      license_completed: input.license_completed ?? true,
      registration_papers_received: input.registration_papers_received ?? true,
      docs_delivered_to_family: input.docs_delivered_to_family ?? true,
      docs_delivered_at: input.docs_delivered_at ?? null,
      photo_taken: input.photo_taken ?? true,
      photo_consent: input.photo_consent ?? false,
      in_whatsapp_group: input.in_whatsapp_group ?? false,
      birth_country: input.birth_country ?? null,
      nationality: input.nationality ?? null,
      address: input.address ?? null,
      address_street_type: input.address_street_type ?? null,
      address_street: input.address_street ?? null,
      address_number: input.address_number ?? null,
      address_municipality: input.address_municipality ?? null,
      address_province: input.address_province ?? null,
      address_postal_code: input.address_postal_code ?? null,
    });
  });

  const incomplete = toImport.filter((item) => item.incomplete);
  const existingTeamNames = new Set((options.teams ?? []).map((team) => fold(team.name)));
  const teamMap = new Map<string, FederationTeamKey>();
  for (const item of toImport) {
    if (!item.teamKey) continue;
    const key = fold(item.teamKey.name);
    if (existingTeamNames.has(key)) continue;
    teamMap.set(key, item.teamKey);
  }
  const teamsToCreate = [...teamMap.values()];

  return {
    toImport,
    discarded,
    incomplete,
    teamsToCreate,
    counts: {
      toImport: toImport.length,
      discarded: discarded.length,
      incomplete: incomplete.length,
      teamsToCreate: teamsToCreate.length,
    },
  };
}
