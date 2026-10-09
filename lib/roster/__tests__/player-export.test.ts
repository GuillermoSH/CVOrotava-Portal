import { describe, expect, it } from "vitest";

import {
  buildPlayersCsv,
  DEFAULT_PLAYER_EXPORT_FIELD_IDS,
  resolvePlayerExportFields,
} from "@/lib/roster/player-export";
import type { PlayerWithDetails } from "@/lib/types/db";

function samplePlayer(overrides: Partial<PlayerWithDetails> = {}): PlayerWithDetails {
  return {
    id: "p1",
    full_name: "Ana Pérez",
    first_name: "Ana",
    last_name: "Pérez",
    birth_date: "2012-03-15",
    team_id: "t1",
    user_id: null,
    season: "2026-27",
    is_active: true,
    gender: "female",
    dni: "12345678Z",
    license_completed: true,
    registration_papers_received: true,
    docs_delivered_to_family: true,
    docs_delivered_at: "2026-09-01T12:00:00.000Z",
    photo_taken: true,
    photo_consent: false,
    photo_path: null,
    in_whatsapp_group: false,
    medical_notes: "Asma leve",
    clothing_size: "m",
    address: null,
    address_street_type: "calle",
    address_street: "Mayor",
    address_number: "1",
    address_door: null,
    address_postal_code: "38300",
    address_municipality: "La Orotava",
    address_province: "Santa Cruz de Tenerife",
    birth_country: null,
    nationality: null,
    pays_extended_monthly: false,
    team: {
      id: "t1",
      name: "Infantil Femenino A",
      category: "infantil",
      gender: "female",
      season: "2026-27",
    },
    contacts: [
      {
        id: "c1",
        player_id: "p1",
        full_name: "María Pérez",
        relationship: "madre",
        phone: "600111222",
        email: "maria@example.com",
        is_primary: true,
        portal_user_id: null,
      },
      {
        id: "c2",
        player_id: "p1",
        full_name: "Juan Pérez",
        relationship: "padre",
        phone: "600333444",
        email: null,
        is_primary: false,
        portal_user_id: null,
      },
    ],
    ...overrides,
  };
}

describe("player-export", () => {
  it("resolves only known fields in request order", () => {
    const fields = resolvePlayerExportFields(["dni", "nope", "first_name", "dni"]);
    expect(fields.map((field) => field.id)).toEqual(["dni", "first_name"]);
  });

  it("builds UTF-8 BOM CSV with selected columns and Sí/No", () => {
    const csv = buildPlayersCsv([samplePlayer()], [
      "first_name",
      "last_name",
      "birth_date",
      "gender",
      "team",
      "phone",
      "photo_consent",
      "medical_notes",
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    const lines = csv.replace(/^\uFEFF/, "").trim().split(/\r\n/);
    expect(lines[0]).toBe(
      "Nombre,Apellidos,Fecha de nacimiento,Sexo,Equipo principal,Teléfono,Autoriza fotos,Enfermedades o patologías detectadas",
    );
    expect(lines[1]).toBe(
      "Ana,Pérez,15/03/2012,Femenino,Infantil Femenino A · Infantil,600111222,No,Asma leve",
    );
  });

  it("escapes commas and quotes in cells", () => {
    const csv = buildPlayersCsv(
      [
        samplePlayer({
          medical_notes: 'Alergia a "frutos secos", asma',
        }),
      ],
      ["first_name", "medical_notes"],
    );
    const line = csv.replace(/^\uFEFF/, "").trim().split(/\r\n/)[1];
    expect(line).toBe('Ana,"Alergia a ""frutos secos"", asma"');
  });

  it("defaults include identity and primary contact phone/email", () => {
    expect(DEFAULT_PLAYER_EXPORT_FIELD_IDS).toEqual(
      expect.arrayContaining(["first_name", "last_name", "dni", "phone", "email", "team"]),
    );
  });
});
