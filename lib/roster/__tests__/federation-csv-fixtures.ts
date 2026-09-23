/**
 * Small Federation CSV fixtures for unit tests.
 * Column names mirror the Federación Canaria export (UTF-8 BOM optional).
 */

export const FED_HEADERS = [
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
  "Telf. móvil",
  "Correo electrónico",
  "Nombre y Apellidos Padre/Madre/Tutor Legal",
  "Categoría",
  "Sexo",
  "Fecha revisión licencia",
  "Fecha validación licencia",
] as const;

export type FedCsvRow = Partial<Record<(typeof FED_HEADERS)[number], string>>;

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return `"${value}"`;
}

/** Build a BOM + quoted CSV string from row objects. */
export function buildFederationCsv(rows: FedCsvRow[], opts?: { bom?: boolean }): string {
  const bom = opts?.bom === false ? "" : "\uFEFF";
  const header = FED_HEADERS.map((h) => csvEscape(h)).join(",");
  const body = rows
    .map((row) => FED_HEADERS.map((h) => csvEscape(row[h] ?? "")).join(","))
    .join("\n");
  return `${bom}${header}\n${body}\n`;
}

/** Valid control letters (via lib/roster/document). */
export const VALID_DNI = "12345678Z";
export const VALID_DNI_2 = "43845963M";
export const VALID_NIE = "X1234567L";
export const VALID_NIE_2 = "Y7534592J";
export const INVALID_DNI = "12345678A";

export const SEASON_CSV_CURRENT = "Temporada 2026-2027 Voleibol";
export const SEASON_CSV_OLD = "Temporada 2019-2020 Voleibol";
export const SEASON_PORTAL = "2026-27";

export function playerRow(overrides: FedCsvRow = {}): FedCsvRow {
  return {
    "Tipo licencia": "Jugador",
    Temporada: SEASON_CSV_CURRENT,
    Nombre: "Ainara",
    Apellidos: "Carballo",
    "Segundo Apellido": "Díaz",
    "Fecha nacimiento": "2013-05-10",
    "Documento identidad": VALID_DNI_2,
    "Número de documento (si no es NIF)  *": "",
    "País de Nacimiento": "España",
    Nacionalidad: "es",
    Domicilio: "C/ El lance nº85",
    Dirección: "",
    "Código Postal": "38414",
    Localidad: "Los Realejos",
    Isla: "Tenerife",
    "Telf. móvil": "669100616",
    "Correo electrónico": "tutor@example.com",
    "Nombre y Apellidos Padre/Madre/Tutor Legal": "Tutor Ejemplo",
    Categoría: "Infantil Voleibol",
    Sexo: "Femenino",
    "Fecha revisión licencia": "2026-09-01 10:00:00",
    "Fecha validación licencia": "2026-09-02 10:00:00",
    ...overrides,
  };
}
