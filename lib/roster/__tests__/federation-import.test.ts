/**
 * Unit tests for Federación Canaria CSV import parser
 * (`lib/roster/federation-import.ts` + address helper).
 */

import { describe, expect, it } from "vitest";

import {
  buildFederationCsv,
  INVALID_DNI,
  playerRow,
  SEASON_CSV_CURRENT,
  SEASON_CSV_OLD,
  SEASON_PORTAL,
  VALID_DNI,
  VALID_NIE,
} from "@/lib/roster/__tests__/federation-csv-fixtures";
import {
  buildFederationTeamKey,
  federationBaseTeamName,
  federationSeasonMatches,
  parseFederationImportCsv,
  type FederationImportRowPreview,
} from "@/lib/roster/federation-import";

function findByDni(rows: FederationImportRowPreview[], dni: string) {
  const normalized = dni.toUpperCase().replace(/[\s.-]/g, "");
  return rows.find((row) => row.dni === normalized);
}

describe("federationSeasonMatches", () => {
  it('matches "Temporada 2026-2027 Voleibol" to portal "2026-27"', () => {
    expect(federationSeasonMatches(SEASON_CSV_CURRENT, SEASON_PORTAL)).toBe(true);
    expect(federationSeasonMatches("2026-2027", SEASON_PORTAL)).toBe(true);
    expect(federationSeasonMatches(SEASON_CSV_OLD, SEASON_PORTAL)).toBe(false);
    expect(federationSeasonMatches("Temporada 2024-2025 Voleibol", SEASON_PORTAL)).toBe(false);
  });
});

describe("parseFederationImportCsv — filters", () => {
  it("keeps current-season Jugador rows and discards old seasons", () => {
    const csv = buildFederationCsv([
      playerRow({ Nombre: "Actual", "Documento identidad": VALID_DNI }),
      playerRow({
        Nombre: "Antigua",
        Temporada: SEASON_CSV_OLD,
        "Documento identidad": "00000000T",
      }),
    ]);

    const preview = parseFederationImportCsv(csv, { season: SEASON_PORTAL });
    expect(findByDni(preview.toImport, VALID_DNI)).toBeTruthy();
    expect(findByDni(preview.toImport, "00000000T")).toBeFalsy();
    expect(preview.discarded.some((d) => d.reason === "otra_temporada")).toBe(true);
  });

  it("imports only Tipo licencia=Jugador; Staff discarded", () => {
    const csv = buildFederationCsv([
      playerRow({ Nombre: "Jugadora", "Documento identidad": VALID_DNI }),
      playerRow({
        Nombre: "Entrenadora",
        "Tipo licencia": "Staff",
        "Documento identidad": "00000000T",
      }),
    ]);

    const preview = parseFederationImportCsv(csv, { season: SEASON_PORTAL });
    expect(findByDni(preview.toImport, VALID_DNI)).toBeTruthy();
    expect(findByDni(preview.toImport, "00000000T")).toBeFalsy();
    expect(preview.discarded.some((d) => d.reason === "no_jugador")).toBe(true);
  });
});

describe("parseFederationImportCsv — document", () => {
  it("accepts valid DNI/NIE and discards invalid or missing", () => {
    const csv = buildFederationCsv([
      playerRow({ Nombre: "ConDni", "Documento identidad": VALID_DNI }),
      playerRow({
        Nombre: "ConNie",
        "Documento identidad": VALID_NIE,
        "País de Nacimiento": "Venezuela",
        Nacionalidad: "ve",
      }),
      playerRow({
        Nombre: "Invalido",
        "Documento identidad": INVALID_DNI,
      }),
      playerRow({
        Nombre: "SinDoc",
        "Documento identidad": "",
        "Número de documento (si no es NIF)  *": "",
      }),
    ]);

    const preview = parseFederationImportCsv(csv, { season: SEASON_PORTAL });
    expect(findByDni(preview.toImport, VALID_DNI)).toBeTruthy();
    expect(findByDni(preview.toImport, VALID_NIE)).toBeTruthy();
    expect(findByDni(preview.toImport, INVALID_DNI)).toBeFalsy();
    expect(preview.discarded.some((d) => d.reason === "dni_invalido")).toBe(true);
    expect(preview.discarded.some((d) => d.reason === "dni_vacio")).toBe(true);
  });

  it("uses non-NIF fallback column only when it validates as DNI/NIE", () => {
    const csv = buildFederationCsv([
      playerRow({
        Nombre: "FallbackOk",
        "Documento identidad": "",
        "Número de documento (si no es NIF)  *": VALID_DNI,
      }),
      playerRow({
        Nombre: "FallbackBad",
        "Documento identidad": "",
        "Número de documento (si no es NIF)  *": "PASAPORTE-ZZ",
      }),
    ]);

    const preview = parseFederationImportCsv(csv, { season: SEASON_PORTAL });
    expect(findByDni(preview.toImport, VALID_DNI)).toBeTruthy();
    expect(preview.toImport.some((r) => r.dni.includes("PASAPORTE"))).toBe(false);
    expect(preview.discarded.some((d) => d.reason === "documento_extranjero")).toBe(true);
  });
});

describe("parseFederationImportCsv — address pessimism", () => {
  it("does not invent address from Dirección=Española; marks missingFields", () => {
    const csv = buildFederationCsv([
      playerRow({
        Nombre: "SinCalle",
        "Documento identidad": VALID_DNI,
        Domicilio: "",
        Dirección: "Española",
        Localidad: "Los Realejos",
        "Código Postal": "38410",
      }),
    ]);

    const preview = parseFederationImportCsv(csv, { season: SEASON_PORTAL });
    const row = findByDni(preview.toImport, VALID_DNI);
    expect(row).toBeTruthy();
    expect(row!.missingFields.length).toBeGreaterThan(0);
    expect(row!.input.address_street).toBeFalsy();
    expect(row!.missingFields.join(" ").toLowerCase()).toMatch(/v[ií]a|n[uú]mero|tipo/);
  });

  it("localidad with ? is not structured as municipality", () => {
    const csv = buildFederationCsv([
      playerRow({
        Nombre: "LocalidadDudosa",
        "Documento identidad": VALID_DNI,
        Domicilio: "Camino Atravesado 1",
        Localidad: "P?uerto de la Cruz",
      }),
    ]);

    const preview = parseFederationImportCsv(csv, { season: SEASON_PORTAL });
    const row = findByDni(preview.toImport, VALID_DNI);
    expect(row).toBeTruthy();
    expect(row!.input.address_municipality).toBeFalsy();
    expect(row!.missingFields.some((f) => /municipio/i.test(f))).toBe(true);
  });
});

describe("parseFederationImportCsv — incomplete still importable + ack", () => {
  it("keeps incomplete rows in toImport with missingFields (not discarded)", () => {
    const csv = buildFederationCsv([
      playerRow({
        Nombre: "Incompleta",
        "Documento identidad": VALID_DNI,
        Domicilio: "",
        Dirección: "Española",
        Localidad: "",
        "Código Postal": "",
        "Telf. móvil": "",
        "Correo electrónico": "",
        "Nombre y Apellidos Padre/Madre/Tutor Legal": "",
      }),
    ]);

    const preview = parseFederationImportCsv(csv, { season: SEASON_PORTAL });
    const row = findByDni(preview.toImport, VALID_DNI);
    expect(row).toBeTruthy();
    expect(row!.incomplete).toBe(true);
    expect(row!.missingFields.length).toBeGreaterThan(0);
    expect(findByDni(preview.incomplete, VALID_DNI)).toBeTruthy();
    expect(preview.discarded.some((d) => d.detail === VALID_DNI)).toBe(false);
  });

  it("confirm ack is required when incomplete.length > 0 (UI gate)", () => {
    // Mirrors PlayersFederationImportSheet: needsAck = incompleteCount > 0
    const csv = buildFederationCsv([
      playerRow({
        Nombre: "Incompleta",
        "Documento identidad": VALID_DNI,
        Domicilio: "",
        Dirección: "Española",
        Localidad: "",
        "Código Postal": "",
        "Telf. móvil": "",
        "Correo electrónico": "",
        "Nombre y Apellidos Padre/Madre/Tutor Legal": "",
      }),
    ]);
    const preview = parseFederationImportCsv(csv, { season: SEASON_PORTAL });
    const needsAck = preview.counts.incomplete > 0;
    expect(needsAck).toBe(true);
    expect(preview.counts.toImport).toBeGreaterThan(0);
  });
});

describe("parseFederationImportCsv — nationality / NIE country", () => {
  it("maps nationality es → empty on DNI rows", () => {
    const csv = buildFederationCsv([
      playerRow({
        Nombre: "Esp",
        "Documento identidad": VALID_DNI,
        Nacionalidad: "es",
        "País de Nacimiento": "España",
      }),
    ]);

    const preview = parseFederationImportCsv(csv, { season: SEASON_PORTAL });
    const row = findByDni(preview.toImport, VALID_DNI);
    expect(row).toBeTruthy();
    expect(row!.input.nationality).toBeFalsy();
  });

  it("NIE without birth country → incomplete (missingFields includes país)", () => {
    const csv = buildFederationCsv([
      playerRow({
        Nombre: "NieSinPais",
        "Documento identidad": VALID_NIE,
        "País de Nacimiento": "",
        Nacionalidad: "ve",
      }),
    ]);

    const preview = parseFederationImportCsv(csv, { season: SEASON_PORTAL });
    const row = findByDni(preview.toImport, VALID_NIE);
    expect(row).toBeTruthy();
    expect(findByDni(preview.incomplete, VALID_NIE)).toBeTruthy();
    expect(row!.missingFields.some((f) => /pa[ií]s|nacimiento/i.test(f))).toBe(true);
  });
});

describe("parseFederationImportCsv — checklist defaults", () => {
  it("sets federative checklist defaults on mapped PlayerWriteInput", () => {
    const csv = buildFederationCsv([
      playerRow({ Nombre: "Check", "Documento identidad": VALID_DNI }),
    ]);

    const preview = parseFederationImportCsv(csv, { season: SEASON_PORTAL });
    const row = findByDni(preview.toImport, VALID_DNI);
    expect(row).toBeTruthy();
    const input = row!.input;
    expect(input.license_completed).toBe(true);
    expect(input.registration_papers_received).toBe(true);
    expect(input.docs_delivered_to_family).toBe(true);
    expect(input.photo_taken).toBe(true);
    expect(input.photo_consent).toBe(false);
    expect(input.in_whatsapp_group).toBe(false);
  });
});

describe("category + Sexo → base team name", () => {
  it("maps Infantil/Cadete/Sénior + Femenino/Masculino to expected names", () => {
    const cases: Array<[string, string, string]> = [
      ["Infantil Voleibol", "Femenino", "Infantil Femenino"],
      ["Cadete Voleibol", "Masculino", "Cadete Masculino"],
      ["Sénior Voleibol", "Femenino", "Sénior Femenino"],
      ["Juvenil Voleibol", "Femenino", "Juvenil Femenino"],
    ];

    for (const [cat, sex, expected] of cases) {
      const key = buildFederationTeamKey(cat, sex);
      expect(key?.name).toBe(expected);
      if (key) {
        expect(federationBaseTeamName(key.category, key.gender)).toBe(expected);
      }
    }

    for (const [cat, sex, expected] of cases) {
      const csv = buildFederationCsv([
        playerRow({
          Nombre: "Mapped",
          Categoría: cat,
          Sexo: sex,
          "Documento identidad": VALID_DNI,
        }),
      ]);
      const preview = parseFederationImportCsv(csv, { season: SEASON_PORTAL });
      const row = findByDni(preview.toImport, VALID_DNI);
      expect(row?.teamName).toBe(expected);
    }
  });
});
