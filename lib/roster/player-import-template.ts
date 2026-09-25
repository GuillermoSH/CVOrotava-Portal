import "server-only";

import ExcelJS from "exceljs";

import { CLOTHING_SIZE_LABELS, CLOTHING_SIZES } from "@/lib/clothing/constants";
import {
  formatTeamCategory,
  GUARDIAN_RELATIONSHIP_LABELS,
  GUARDIAN_RELATIONSHIPS,
  SPAIN_PROVINCES,
  STREET_TYPE_LABELS,
  STREET_TYPES,
} from "@/lib/roster/constants";
import {
  PLAYER_IMPORT_HEADERS,
  PLAYER_IMPORT_MAX_ROWS,
  PLAYER_IMPORT_NO_TEAM,
  PLAYER_IMPORT_YES_NO_HEADERS,
  playerImportExampleRows,
  playerImportTeamLabel,
} from "@/lib/roster/player-import";
import type { Team } from "@/lib/types/db";

const LAST_DATA_ROW = PLAYER_IMPORT_MAX_ROWS + 1;

const YES_NO = ["sí", "no"] as const;

const HEADER_NOTES: Record<(typeof PLAYER_IMPORT_HEADERS)[number], string> = {
  Nombre: "Obligatorio. Nombre del jugador.",
  Apellidos: "Obligatorio.",
  "Fecha de nacimiento":
    "Obligatorio. DD/MM/AAAA. Mayor de edad: teléfono y email del jugador. Menor: contacto de madre, padre o tutor. Si no hay fecha, la ficha se trata como menor.",
  "DNI / NIE":
    "Obligatorio. DNI o NIE con letra de control. Si es NIE, indica país de nacimiento y la nacionalidad si no es española.",
  "País de nacimiento": "Obligatorio solo si el documento es un NIE.",
  Nacionalidad: "Déjalo vacío si es española. Si no es española, indícala.",
  "Tipo de vía": "Obligatorio. Elige de la lista: Calle, Avenida, Carretera, Plaza, Paseo, Camino, Urbanización u Otro.",
  Vía: "Obligatorio. Nombre de la calle.",
  Número: "Obligatorio. Número de portal, o s/n.",
  "Piso / puerta": "Opcional.",
  "Código postal": "Obligatorio. 5 dígitos de España.",
  Municipio: "Obligatorio.",
  Provincia:
    "Obligatorio. Elige de la lista (Canarias primero). En la ficha el valor por defecto es Santa Cruz de Tenerife.",
  Dirección: "Opcional. Solo si no rellenas el domicilio. En la ficha ya no se pide este campo.",
  "Equipo principal": "Opcional. Elige de la lista o Sin equipo.",
  Talla: "Opcional. Misma lista que en la ficha (adulto, infantil en cm, única).",
  Teléfono: "Mayor de 18: obligatorio (teléfono del jugador).",
  Email: "Mayor de 18: obligatorio (email del jugador).",
  "Contacto nombre": "Menor: obligatorio. Contacto principal (madre, padre o tutor).",
  "Contacto parentesco": "Menor: obligatorio. Madre, Padre, Tutor/a u Otro.",
  "Contacto teléfono": "Menor: obligatorio.",
  "Contacto email": "Menor: obligatorio.",
  "Contacto 2 nombre": "Opcional. Segundo contacto.",
  "Contacto 2 parentesco": "Si hay segundo contacto: Madre, Padre, Tutor/a u Otro.",
  "Contacto 2 teléfono": "Si hay segundo contacto: obligatorio.",
  "Contacto 2 email": "Si hay segundo contacto: obligatorio.",
  "Docs entregados": "Opcional. Se los damos al jugador / familia. sí o no.",
  "Fecha de entrega de docs": "Opcional. Si docs entregados = sí. DD/MM/AAAA.",
  "Papeles recibidos": "Opcional. Vuelven rellenos al club. sí o no.",
  "Foto hecha": "Opcional. Para la ficha / licencia. sí o no.",
  "Licencia realizada": "Opcional. Federativa de la temporada. sí o no.",
  "En grupo WhatsApp": "Opcional. sí o no.",
  "Autoriza fotos": "Opcional. Redes, cartel, material del club. sí o no.",
  "Enfermedades o patologías detectadas":
    "Opcional. Alergias, asma, lesiones… Lo ve dirección y cuerpo técnico.",
};

function colIndex(header: (typeof PLAYER_IMPORT_HEADERS)[number]): number {
  return PLAYER_IMPORT_HEADERS.indexOf(header) + 1;
}

function listRange(columnLetter: string, count: number): string {
  const end = Math.max(2, count + 1);
  return `Listas!$${columnLetter}$2:$${columnLetter}$${end}`;
}

function fillListColumn(
  sheet: ExcelJS.Worksheet,
  column: number,
  title: string,
  values: readonly string[],
) {
  sheet.getCell(1, column).value = title;
  sheet.getCell(1, column).font = { bold: true };
  values.forEach((value, index) => {
    sheet.getCell(index + 2, column).value = value;
  });
  sheet.getColumn(column).width = Math.max(18, title.length + 2, ...values.map((value) => Math.min(40, value.length + 2)));
}

function addClosedList(
  sheet: ExcelJS.Worksheet,
  header: (typeof PLAYER_IMPORT_HEADERS)[number],
  formula: string,
  error: string,
) {
  const col = colIndex(header);
  for (let row = 2; row <= LAST_DATA_ROW; row++) {
    sheet.getCell(row, col).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [formula],
      showErrorMessage: true,
      errorStyle: "stop",
      errorTitle: "Valor no válido",
      error,
      showInputMessage: true,
      promptTitle: header,
      prompt: "Elige un valor de la lista. Si pones otro, Excel no lo admite.",
    };
  }
}

export async function buildPlayerImportWorkbook(teams: Team[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CVOrotava Portal";

  const sizeLabels = CLOTHING_SIZES.map((size) => CLOTHING_SIZE_LABELS[size]);
  const streetLabels = STREET_TYPES.map((type) => STREET_TYPE_LABELS[type]);
  const relationshipLabels = GUARDIAN_RELATIONSHIPS.map((item) => GUARDIAN_RELATIONSHIP_LABELS[item]);
  const teamLabels = [PLAYER_IMPORT_NO_TEAM, ...teams.map(playerImportTeamLabel)];

  const lists = workbook.addWorksheet("Listas");
  fillListColumn(lists, 1, "Equipos", teamLabels);
  fillListColumn(lists, 2, "Tallas", sizeLabels);
  fillListColumn(lists, 3, "Tipos de vía", streetLabels);
  fillListColumn(lists, 4, "Provincias", SPAIN_PROVINCES);
  fillListColumn(lists, 5, "Parentesco", relationshipLabels);
  fillListColumn(lists, 6, "Sí/No", YES_NO);
  lists.views = [{ state: "frozen", ySplit: 1 }];

  const players = workbook.addWorksheet("Jugadores");
  PLAYER_IMPORT_HEADERS.forEach((header, index) => {
    const cell = players.getCell(1, index + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.note = HEADER_NOTES[header];
    players.getColumn(index + 1).width = Math.min(36, Math.max(14, header.length + 2));
  });
  playerImportExampleRows(teams).forEach((row, rowIndex) => {
    row.forEach((value, colIndexZero) => {
      players.getCell(rowIndex + 2, colIndexZero + 1).value = value;
    });
  });
  players.views = [{ state: "frozen", ySplit: 1 }];

  addClosedList(
    players,
    "Equipo principal",
    listRange("A", teamLabels.length),
    "Elige un equipo de la lista o Sin equipo.",
  );
  addClosedList(players, "Talla", listRange("B", sizeLabels.length), "Elige una talla de la lista.");
  addClosedList(
    players,
    "Tipo de vía",
    listRange("C", streetLabels.length),
    `Elige: ${streetLabels.join(", ")}.`,
  );
  addClosedList(
    players,
    "Provincia",
    listRange("D", SPAIN_PROVINCES.length),
    "Elige una provincia de la lista.",
  );
  addClosedList(
    players,
    "Contacto parentesco",
    listRange("E", relationshipLabels.length),
    "Elige: Madre, Padre, Tutor/a u Otro.",
  );
  addClosedList(
    players,
    "Contacto 2 parentesco",
    listRange("E", relationshipLabels.length),
    "Elige: Madre, Padre, Tutor/a u Otro.",
  );
  for (const header of PLAYER_IMPORT_YES_NO_HEADERS) {
    addClosedList(players, header, listRange("F", YES_NO.length), "Usa sí o no.");
  }

  const teamsSheet = workbook.addWorksheet("Equipos");
  teamsSheet.getCell(1, 1).value = "Equipo";
  teamsSheet.getCell(1, 2).value = "Categoría";
  teamsSheet.getCell(1, 3).value = "Género";
  teamsSheet.getRow(1).font = { bold: true };
  teams.forEach((team, index) => {
    teamsSheet.getCell(index + 2, 1).value = team.name;
    teamsSheet.getCell(index + 2, 2).value = formatTeamCategory(team.category);
    teamsSheet.getCell(index + 2, 3).value = team.gender === "female" ? "Femenino" : "Masculino";
  });
  teamsSheet.columns = [{ width: 28 }, { width: 16 }, { width: 14 }];

  const help = workbook.addWorksheet("Instrucciones");
  const helpLines = [
    "Cómo rellenar",
    "No borres la primera fila. Puedes borrar las dos filas de ejemplo.",
    "Pasa el ratón por el título de cada columna: la nota es lo mismo que pide la ficha.",
    "Las columnas cerradas (equipo, talla, tipo de vía, provincia, parentesco, sí/no) tienen lista. Si pones otro valor, Excel muestra error y no lo admite.",
    "Las listas están en la hoja Listas. No las edites.",
    "Fecha de nacimiento y fecha de entrega de docs: DD/MM/AAAA o AAAA-MM-DD.",
    "DNI / NIE obligatorio y válido (letra de control). NIE: país de nacimiento. Nacionalidad solo si no es española.",
    "Domicilio: tipo de vía, vía, número, CP, municipio y provincia son obligatorios. Piso / puerta es opcional.",
    "Mayor de 18: teléfono y email del propio jugador. Deja los contactos familiares vacíos.",
    "Menor: contacto familiar completo (nombre, parentesco, teléfono y email).",
    `Máximo ${PLAYER_IMPORT_MAX_ROWS} jugadores por archivo.`,
  ];
  helpLines.forEach((line, index) => {
    help.getCell(index + 1, 1).value = line;
  });
  help.getColumn(1).width = 110;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
