import "server-only";

import * as XLSX from "xlsx";

import { CLOTHING_SIZE_LABELS, CLOTHING_SIZES } from "@/lib/clothing/constants";
import { contactsForPlayerAge, isLegalAdult } from "@/lib/roster/age";
import {
  GUARDIAN_RELATIONSHIP_LABELS,
  type ContactRelationship,
  type GuardianRelationship,
} from "@/lib/roster/constants";
import type { PlayerWriteInput } from "@/lib/roster/repository/players";
import { createPlayerSchema } from "@/lib/roster/schemas";
import type { ClothingSize, Team } from "@/lib/types/db";

export const PLAYER_IMPORT_MAX_ROWS = 200;

export const PLAYER_IMPORT_HEADERS = [
  "Nombre",
  "Apellidos",
  "Fecha de nacimiento",
  "DNI",
  "Equipo",
  "Talla",
  "Dirección",
  "Licencia",
  "Papeles",
  "Notas médicas",
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
] as const;

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
  dni: "DNI",
  nie: "DNI",
  "dni / nie": "DNI",
  equipo: "Equipo",
  team: "Equipo",
  talla: "Talla",
  size: "Talla",
  direccion: "Dirección",
  dirección: "Dirección",
  address: "Dirección",
  licencia: "Licencia",
  papeles: "Papeles",
  "notas medicas": "Notas médicas",
  "notas médicas": "Notas médicas",
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

function parseYesNo(raw: string): boolean {
  const value = fold(raw);
  return value === "si" || value === "sí" || value === "s" || value === "yes" || value === "1" || value === "true" || value === "x";
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

function exampleRows(teams: Team[]): string[][] {
  const youth = teams.find((team) => team.category !== "senior") ?? teams[0];
  const senior = teams.find((team) => team.category === "senior") ?? teams[1] ?? teams[0];
  return [
    [
      "Lucía",
      "Acosta",
      "12/03/2014",
      "",
      youth?.name ?? "",
      "140",
      "",
      "no",
      "no",
      "",
      "",
      "",
      "Ana Acosta",
      "madre",
      "922000111",
      "ana.acosta@correo.test",
      "",
      "",
      "",
      "",
    ],
    [
      "Marcos",
      "Díaz",
      "02/08/1999",
      "",
      senior?.name ?? youth?.name ?? "",
      "L",
      "",
      "sí",
      "sí",
      "",
      "922000222",
      "marcos.diaz@correo.test",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
  ];
}

export function buildPlayerImportWorkbook(teams: Team[]): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet([
    [...PLAYER_IMPORT_HEADERS],
    ...exampleRows(teams),
  ]);
  sheet["!cols"] = PLAYER_IMPORT_HEADERS.map((header) => ({
    wch: Math.max(14, header.length + 2),
  }));

  const teamsSheet = XLSX.utils.aoa_to_sheet([
    ["Equipo", "Categoría", "Género"],
    ...teams.map((team) => [team.name, team.category, team.gender === "female" ? "Femenino" : "Masculino"]),
  ]);

  const helpSheet = XLSX.utils.aoa_to_sheet([
    ["Cómo rellenar"],
    ["No borres la primera fila. Puedes borrar las dos filas de ejemplo."],
    ["Fecha de nacimiento: DD/MM/AAAA o AAAA-MM-DD."],
    ["Equipo: copia el nombre exacto de la hoja Equipos."],
    ["Talla: XS, S, M, L, XL, 140, 152, Única…"],
    ["Licencia y papeles: sí o no."],
    ["Parentesco: madre, padre, tutor u otro."],
    ["Mayor de 18: teléfono y email del propio jugador. Deja los contactos vacíos."],
    ["Menor: rellena al menos un contacto familiar (nombre + teléfono o email)."],
    [`Máximo ${PLAYER_IMPORT_MAX_ROWS} jugadores por archivo.`],
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Jugadores");
  XLSX.utils.book_append_sheet(workbook, teamsSheet, "Equipos");
  XLSX.utils.book_append_sheet(workbook, helpSheet, "Instrucciones");
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
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
  if (!columns.includes("Nombre") || !columns.includes("Apellidos") || !columns.includes("Equipo")) {
    return {
      ready: [],
      issues: [{ row: 1, message: "Faltan columnas Nombre, Apellidos o Equipo. Usa la plantilla del portal." }],
    };
  }

  const teamByName = new Map(teams.map((team) => [fold(team.name), team]));
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

    const teamName = get("Equipo");
    const team = teamByName.get(fold(teamName));
    if (!team) {
      issues.push({ row, message: teamName ? `No hay un equipo llamado “${teamName}” esta temporada` : "Falta el equipo" });
      return;
    }

    const size = parseSize(get("Talla"));
    if (size === "invalid") {
      issues.push({ row, message: `Talla no válida: ${get("Talla")}` });
      return;
    }

    const rel1 = parseRelationship(get("Contacto parentesco"));
    const rel2 = parseRelationship(get("Contacto 2 parentesco"));
    if (rel1 === "invalid" || rel2 === "invalid") {
      issues.push({ row, message: "Parentesco no válido. Usa madre, padre, tutor u otro." });
      return;
    }

    const dni = get("DNI").toUpperCase();
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

    const parsed = createPlayerSchema.safeParse({
      first_name: firstName,
      last_name: lastName,
      birth_date: birthRaw,
      dni: dni || undefined,
      team_id: team.id,
      season,
      license_completed: parseYesNo(get("Licencia")),
      registration_papers_received: parseYesNo(get("Papeles")),
      medical_notes: get("Notas médicas") || undefined,
      clothing_size: size,
      address: get("Dirección") || undefined,
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
