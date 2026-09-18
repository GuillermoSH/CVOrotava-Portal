import "server-only";

import * as XLSX from "xlsx";

import { CLOTHING_SIZE_LABELS, CLOTHING_SIZES } from "@/lib/clothing/constants";
import { formatPlayerAddress, normalizeProvince, normalizeStreetType } from "@/lib/roster/address";
import { contactsForPlayerAge, isLegalAdult } from "@/lib/roster/age";
import {
  formatTeamCategory,
  GUARDIAN_RELATIONSHIP_LABELS,
  SPAIN_PROVINCES,
  STREET_TYPE_LABELS,
  type ContactRelationship,
  type GuardianRelationship,
} from "@/lib/roster/constants";
import type { PlayerWriteInput } from "@/lib/roster/repository/players";
import { createPlayerSchema } from "@/lib/roster/schemas";
import type { ClothingSize, Team } from "@/lib/types/db";

export const PLAYER_IMPORT_MAX_ROWS = 200;

export const PLAYER_IMPORT_NO_TEAM = "Sin equipo";

export const PLAYER_IMPORT_HEADERS = [
  "Nombre",
  "Apellidos",
  "Fecha de nacimiento",
  "DNI / NIE",
  "País de nacimiento",
  "Nacionalidad",
  "Tipo de vía",
  "Vía",
  "Número",
  "Piso / puerta",
  "Código postal",
  "Municipio",
  "Provincia",
  "Dirección",
  "Equipo principal",
  "Talla",
  "Teléfono",
  "Email",
  "Contacto nombre",
  "Contacto parentesco",
  "Contacto teléfono",
  "Contacto email",
  "Contacto 2 nombre",
  "Contacto 2 parentesco",
  "Contacto 2 teléfono",
  "Contacto 2 email",
  "Docs entregados",
  "Fecha de entrega de docs",
  "Papeles recibidos",
  "Foto hecha",
  "Licencia realizada",
  "En grupo WhatsApp",
  "Autoriza fotos",
  "Enfermedades o patologías detectadas",
] as const;

export const PLAYER_IMPORT_YES_NO_HEADERS = [
  "Docs entregados",
  "Papeles recibidos",
  "Foto hecha",
  "Licencia realizada",
  "En grupo WhatsApp",
  "Autoriza fotos",
] as const;

export function playerImportTeamLabel(team: Team): string {
  return `${team.name} · ${formatTeamCategory(team.category)}`;
}

const HEADER_ALIASES: Record<string, (typeof PLAYER_IMPORT_HEADERS)[number]> = {
  nombre: "Nombre",
  name: "Nombre",
  first_name: "Nombre",
  apellidos: "Apellidos",
  apellido: "Apellidos",
  last_name: "Apellidos",
  "fecha de nacimiento": "Fecha de nacimiento",
  fecha_nacimiento: "Fecha de nacimiento",
  nacimiento: "Fecha de nacimiento",
  birth_date: "Fecha de nacimiento",
  dni: "DNI / NIE",
  nie: "DNI / NIE",
  "dni / nie": "DNI / NIE",
  "pais de nacimiento": "País de nacimiento",
  "país de nacimiento": "País de nacimiento",
  birth_country: "País de nacimiento",
  nacionalidad: "Nacionalidad",
  nationality: "Nacionalidad",
  equipo: "Equipo principal",
  team: "Equipo principal",
  "equipo principal": "Equipo principal",
  talla: "Talla",
  size: "Talla",
  "tipo de via": "Tipo de vía",
  "tipo de vía": "Tipo de vía",
  via: "Vía",
  vía: "Vía",
  numero: "Número",
  número: "Número",
  puerta: "Piso / puerta",
  "piso / puerta": "Piso / puerta",
  piso: "Piso / puerta",
  "codigo postal": "Código postal",
  "código postal": "Código postal",
  cp: "Código postal",
  municipio: "Municipio",
  localidad: "Municipio",
  provincia: "Provincia",
  direccion: "Dirección",
  dirección: "Dirección",
  address: "Dirección",
  licencia: "Licencia realizada",
  "licencia realizada": "Licencia realizada",
  papeles: "Papeles recibidos",
  "papeles recibidos": "Papeles recibidos",
  "docs entregados": "Docs entregados",
  docs: "Docs entregados",
  "documentacion entregada": "Docs entregados",
  "documentación entregada": "Docs entregados",
  "fecha docs": "Fecha de entrega de docs",
  "fecha docs entregados": "Fecha de entrega de docs",
  "fecha de entrega de docs": "Fecha de entrega de docs",
  docs_delivered_at: "Fecha de entrega de docs",
  foto: "Foto hecha",
  "foto hecha": "Foto hecha",
  photo: "Foto hecha",
  photo_taken: "Foto hecha",
  whatsapp: "En grupo WhatsApp",
  "en grupo whatsapp": "En grupo WhatsApp",
  "grupo whatsapp": "En grupo WhatsApp",
  in_whatsapp_group: "En grupo WhatsApp",
  "autoriza fotos": "Autoriza fotos",
  photo_consent: "Autoriza fotos",
  "notas medicas": "Enfermedades o patologías detectadas",
  "notas médicas": "Enfermedades o patologías detectadas",
  "enfermedades o patologias detectadas": "Enfermedades o patologías detectadas",
  telefono: "Teléfono",
  teléfono: "Teléfono",
  phone: "Teléfono",
  email: "Email",
  "contacto nombre": "Contacto nombre",
  "contacto parentesco": "Contacto parentesco",
  "contacto telefono": "Contacto teléfono",
  "contacto teléfono": "Contacto teléfono",
  "contacto email": "Contacto email",
  "contacto 2 nombre": "Contacto 2 nombre",
  "contacto 2 parentesco": "Contacto 2 parentesco",
  "contacto 2 telefono": "Contacto 2 teléfono",
  "contacto 2 teléfono": "Contacto 2 teléfono",
  "contacto 2 email": "Contacto 2 email",
};

export type PlayerImportIssue = {
  row: number;
  message: string;
};

export type PlayerImportReady = {
  row: number;
  label: string;
  input: PlayerWriteInput;
};

export type PlayerImportParseResult = {
  ready: PlayerImportReady[];
  issues: PlayerImportIssue[];
};

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function cellText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return String(value).trim();
}

function parseDate(raw: string): string | null | "invalid" {
  const value = raw.trim();
  if (!value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value);
  if (dmy) {
    const day = dmy[1]!.padStart(2, "0");
    const month = dmy[2]!.padStart(2, "0");
    return `${dmy[3]}-${month}-${day}`;
  }
  return "invalid";
}

function parseYesNo(raw: string): boolean | "invalid" {
  const value = fold(raw);
  if (!value) return false;
  if (value === "si" || value === "s" || value === "yes" || value === "1" || value === "true" || value === "x") {
    return true;
  }
  if (value === "no" || value === "n" || value === "false" || value === "0") return false;
  return "invalid";
}

function parseSize(raw: string): ClothingSize | null | "invalid" {
  const value = fold(raw);
  if (!value) return null;
  const fromLabel = CLOTHING_SIZES.find((size) => fold(CLOTHING_SIZE_LABELS[size]) === value);
  if (fromLabel) return fromLabel;
  if ((CLOTHING_SIZES as readonly string[]).includes(value)) return value as ClothingSize;
  if (value === "unica" || value === "única") return "one_size";
  return "invalid";
}

function parseRelationship(raw: string): GuardianRelationship | "invalid" | "" {
  const value = fold(raw);
  if (!value) return "";
  if (value === "madre" || value === "padre" || value === "tutor" || value === "tutora" || value === "otro") {
    return value === "tutora" ? "tutor" : (value as GuardianRelationship);
  }
  const fromLabel = (Object.entries(GUARDIAN_RELATIONSHIP_LABELS) as [GuardianRelationship, string][]).find(
    ([, label]) => fold(label) === value,
  );
  if (fromLabel) return fromLabel[0];
  if (value === "jugador") return "invalid";
  return "invalid";
}

function mapHeader(raw: string): (typeof PLAYER_IMPORT_HEADERS)[number] | null {
  const direct = HEADER_ALIASES[fold(raw)];
  if (direct) return direct;
  const exact = PLAYER_IMPORT_HEADERS.find((header) => fold(header) === fold(raw));
  return exact ?? null;
}

function exampleRow(
  cells: Partial<Record<(typeof PLAYER_IMPORT_HEADERS)[number], string>>,
): string[] {
  return PLAYER_IMPORT_HEADERS.map((header) => cells[header] ?? "");
}

export function playerImportExampleRows(teams: Team[]): string[][] {
  const youth = teams.find((team) => team.category !== "senior") ?? teams[0];
  const senior = teams.find((team) => team.category === "senior") ?? teams[1] ?? teams[0];
  return [
    exampleRow({
      Nombre: "Lucía",
      Apellidos: "Acosta",
      "Fecha de nacimiento": "12/03/2014",
      "DNI / NIE": "12345678Z",
      "Equipo principal": youth ? playerImportTeamLabel(youth) : PLAYER_IMPORT_NO_TEAM,
      Talla: "140",
      "Tipo de vía": "Calle",
      Vía: "San Francisco",
      Número: "12",
      "Piso / puerta": "2ºA",
      "Código postal": "38300",
      Municipio: "La Orotava",
      Provincia: "Santa Cruz de Tenerife",
      "Licencia realizada": "no",
      "Papeles recibidos": "no",
      "Docs entregados": "no",
      "Foto hecha": "no",
      "En grupo WhatsApp": "no",
      "Autoriza fotos": "no",
      "Contacto nombre": "Ana Acosta",
      "Contacto parentesco": "Madre",
      "Contacto teléfono": "922000111",
      "Contacto email": "ana.acosta@correo.test",
    }),
    exampleRow({
      Nombre: "Marcos",
      Apellidos: "Díaz",
      "Fecha de nacimiento": "02/08/1999",
      "DNI / NIE": "X1234567L",
      "País de nacimiento": "Venezuela",
      Nacionalidad: "venezolana",
      "Equipo principal": senior
        ? playerImportTeamLabel(senior)
        : youth
          ? playerImportTeamLabel(youth)
          : PLAYER_IMPORT_NO_TEAM,
      Talla: "L",
      "Tipo de vía": "Avenida",
      Vía: "Marítima",
      Número: "8",
      "Código postal": "38400",
      Municipio: "Puerto de la Cruz",
      Provincia: "Santa Cruz de Tenerife",
      "Licencia realizada": "sí",
      "Papeles recibidos": "sí",
      "Docs entregados": "sí",
      "Fecha de entrega de docs": "01/09/2025",
      "Foto hecha": "sí",
      "En grupo WhatsApp": "sí",
      "Autoriza fotos": "sí",
      Teléfono: "922000222",
      Email: "marcos.diaz@correo.test",
    }),
  ];
}

function rowsFromSheet(sheet: XLSX.WorkSheet): string[][] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  return matrix.map((row) => (Array.isArray(row) ? row.map((cell) => cellText(cell)) : []));
}

export function parsePlayerImportFile(
  bytes: ArrayBuffer | Buffer | Uint8Array,
  teams: Team[],
  season: string,
): PlayerImportParseResult {
  const workbook = XLSX.read(bytes, { type: "buffer", cellDates: true });
  const sheet =
    workbook.Sheets.Jugadores ??
    workbook.Sheets[workbook.SheetNames.find((name) => fold(name) === "jugadores") ?? ""] ??
    workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!sheet) {
    return { ready: [], issues: [{ row: 0, message: "El archivo no tiene una hoja de jugadores" }] };
  }

  const table = rowsFromSheet(sheet);
  const headerRow = table[0] ?? [];
  const columns = headerRow.map((header) => mapHeader(header));
  if (
    !columns.includes("Nombre") ||
    !columns.includes("Apellidos") ||
    !columns.includes("Equipo principal")
  ) {
    return {
      ready: [],
      issues: [
        {
          row: 1,
          message: "Faltan columnas Nombre, Apellidos o Equipo principal. Usa la plantilla del portal.",
        },
      ],
    };
  }

  const teamByImport = new Map<string, Team>();
  for (const team of teams) {
    teamByImport.set(fold(team.name), team);
    teamByImport.set(fold(playerImportTeamLabel(team)), team);
  }
  const issues: PlayerImportIssue[] = [];
  const ready: PlayerImportReady[] = [];
  const seenDni = new Set<string>();
  const dataRows = table.slice(1);

  if (dataRows.length > PLAYER_IMPORT_MAX_ROWS) {
    issues.push({
      row: 0,
      message: `El archivo tiene ${dataRows.length} filas. El máximo es ${PLAYER_IMPORT_MAX_ROWS}.`,
    });
    return { ready, issues };
  }

  dataRows.forEach((cells, index) => {
    const row = index + 2;
    const get = (header: (typeof PLAYER_IMPORT_HEADERS)[number]) => {
      const col = columns.indexOf(header);
      return col >= 0 ? (cells[col] ?? "").trim() : "";
    };

    const firstName = get("Nombre");
    const lastName = get("Apellidos");
    const empty = PLAYER_IMPORT_HEADERS.every((header) => !get(header));
    if (empty || (!firstName && !lastName)) return;

    const birthRaw = parseDate(get("Fecha de nacimiento"));
    if (birthRaw === "invalid") {
      issues.push({ row, message: "Fecha de nacimiento no válida. Usa DD/MM/AAAA." });
      return;
    }

    const teamName = get("Equipo principal");
    const teamKey = fold(teamName);
    const team =
      !teamKey || teamKey === fold(PLAYER_IMPORT_NO_TEAM) ? undefined : teamByImport.get(teamKey);
    if (teamName && teamKey !== fold(PLAYER_IMPORT_NO_TEAM) && !team) {
      issues.push({
        row,
        message: `Equipo no válido: ${teamName}. Elige uno de la lista o Sin equipo.`,
      });
      return;
    }

    const size = parseSize(get("Talla"));
    if (size === "invalid") {
      issues.push({
        row,
        message: `Talla no válida: ${get("Talla")}. Usa la lista de la plantilla.`,
      });
      return;
    }

    const rel1 = parseRelationship(get("Contacto parentesco"));
    const rel2 = parseRelationship(get("Contacto 2 parentesco"));
    if (rel1 === "invalid" || rel2 === "invalid") {
      issues.push({ row, message: "Parentesco no válido. Usa Madre, Padre, Tutor/a u Otro." });
      return;
    }

    const streetTypeRaw = get("Tipo de vía");
    const streetType = normalizeStreetType(streetTypeRaw);
    if (streetTypeRaw && !streetType) {
      issues.push({
        row,
        message: `Tipo de vía no válido. Usa ${Object.values(STREET_TYPE_LABELS).join(", ")}.`,
      });
      return;
    }

    const provinceRaw = get("Provincia");
    const province = normalizeProvince(provinceRaw);
    if (provinceRaw && !SPAIN_PROVINCES.some((item) => item === province)) {
      issues.push({ row, message: `Provincia no válida: ${provinceRaw}. Usa la lista de la plantilla.` });
      return;
    }

    const yesNo = {} as Record<(typeof PLAYER_IMPORT_YES_NO_HEADERS)[number], boolean>;
    let yesNoInvalid = false;
    for (const header of PLAYER_IMPORT_YES_NO_HEADERS) {
      const parsedYesNo = parseYesNo(get(header));
      if (parsedYesNo === "invalid") {
        issues.push({ row, message: `${header}: usa sí o no.` });
        yesNoInvalid = true;
        break;
      }
      yesNo[header] = parsedYesNo;
    }
    if (yesNoInvalid) return;

    const dni = get("DNI / NIE").toUpperCase();
    if (dni) {
      const key = dni.replace(/\s+/g, "");
      if (seenDni.has(key)) {
        issues.push({ row, message: `DNI repetido en el archivo: ${dni}` });
        return;
      }
      seenDni.add(key);
    }

    const adult = isLegalAdult(birthRaw);
    const family = [
      {
        full_name: get("Contacto nombre"),
        relationship: (rel1 || "madre") as ContactRelationship,
        phone: get("Contacto teléfono"),
        email: get("Contacto email"),
        is_primary: true,
      },
      {
        full_name: get("Contacto 2 nombre"),
        relationship: (rel2 || "padre") as ContactRelationship,
        phone: get("Contacto 2 teléfono"),
        email: get("Contacto 2 email"),
        is_primary: false,
      },
    ].filter((contact) => contact.full_name.trim());

    const contacts = contactsForPlayerAge({
      birthDate: birthRaw,
      firstName,
      lastName,
      contacts: adult
        ? [
            {
              full_name: `${firstName} ${lastName}`.trim(),
              relationship: "jugador" as ContactRelationship,
              phone: get("Teléfono"),
              email: get("Email"),
              is_primary: true,
            },
          ]
        : family,
    });

    const docsDelivered = yesNo["Docs entregados"];
    const docsDateRaw = parseDate(get("Fecha de entrega de docs"));
    if (docsDateRaw === "invalid") {
      issues.push({ row, message: "Fecha de entrega de docs no válida. Usa DD/MM/AAAA." });
      return;
    }

    const addressStreet = get("Vía");
    const addressNumber = get("Número");
    const addressDoor = get("Piso / puerta");
    const postalCode = get("Código postal").replace(/\D/g, "").slice(0, 5);
    const municipality = get("Municipio");
    const address = formatPlayerAddress({
      street_type: streetType,
      street: addressStreet,
      number: addressNumber,
      door: addressDoor,
      postal_code: postalCode,
      municipality,
      province,
      fallback: get("Dirección"),
    });

    const parsed = createPlayerSchema.safeParse({
      first_name: firstName,
      last_name: lastName,
      birth_date: birthRaw,
      dni: dni || undefined,
      birth_country: get("País de nacimiento") || undefined,
      nationality: get("Nacionalidad") || undefined,
      team_id: team?.id ?? null,
      season,
      license_completed: yesNo["Licencia realizada"],
      registration_papers_received: yesNo["Papeles recibidos"],
      docs_delivered_to_family: docsDelivered,
      docs_delivered_at: docsDelivered ? docsDateRaw : null,
      photo_taken: yesNo["Foto hecha"],
      photo_consent: yesNo["Autoriza fotos"],
      in_whatsapp_group: yesNo["En grupo WhatsApp"],
      medical_notes: get("Enfermedades o patologías detectadas") || undefined,
      clothing_size: size,
      address: address || undefined,
      address_street_type: streetType,
      address_street: addressStreet || undefined,
      address_number: addressNumber || undefined,
      address_door: addressDoor || undefined,
      address_postal_code: postalCode || undefined,
      address_municipality: municipality || undefined,
      address_province: province,
      contacts,
    });

    if (!parsed.success) {
      issues.push({ row, message: parsed.error.issues[0]?.message ?? "Fila no válida" });
      return;
    }

    ready.push({
      row,
      label: `${firstName} ${lastName}`.trim(),
      input: parsed.data,
    });
  });

  if (ready.length === 0 && issues.length === 0) {
    issues.push({ row: 0, message: "No hay filas con nombre y apellidos para importar" });
  }

  return { ready, issues };
}

export function playerImportFilename(season: string): string {
  return `CVOrotava-jugadores-${season}.xlsx`;
}
