import { describe, expect, it } from "vitest";

import {
  omitPreservedFields,
  PRESERVABLE_PLAYER_FIELDS,
  unchangedPlayerFields,
  type PreservablePlayerValues,
} from "@/lib/roster/player-update";
import { updatePlayerSchema } from "@/lib/roster/schemas";

function values(partial: Partial<PreservablePlayerValues> = {}): PreservablePlayerValues {
  return {
    team_id: "t1",
    gender: "female",
    license_completed: false,
    registration_papers_received: false,
    docs_delivered_to_family: false,
    docs_delivered_at: null,
    photo_taken: false,
    photo_consent: false,
    in_whatsapp_group: false,
    pays_extended_monthly: false,
    is_active: true,
    ...partial,
  };
}

describe("unchangedPlayerFields", () => {
  it("returns every field when nothing changed in the form", () => {
    expect(unchangedPlayerFields(values(), values())).toEqual([...PRESERVABLE_PLAYER_FIELDS]);
  });

  it("leaves out the fields the user edited", () => {
    const preserved = unchangedPlayerFields(
      values(),
      values({ license_completed: true, team_id: "t2" }),
    );
    expect(preserved).not.toContain("license_completed");
    expect(preserved).not.toContain("team_id");
    expect(preserved).toContain("in_whatsapp_group");
  });

  it("keeps the WhatsApp flag preserved when it was changed elsewhere (regression)", () => {
    // La ficha se cargó con in_whatsapp_group=false; en el drawer se marcó a true.
    // El usuario solo cambió el teléfono: el flag no se toca en la ficha.
    const preserved = unchangedPlayerFields(values(), values());
    expect(preserved).toContain("in_whatsapp_group");
  });
});

describe("omitPreservedFields", () => {
  const patch = {
    first_name: "Ana",
    in_whatsapp_group: false,
    team_id: "t1",
    is_active: true,
  };

  it("drops the preserved columns from the update patch", () => {
    expect(omitPreservedFields(patch, ["in_whatsapp_group", "is_active"])).toEqual({
      first_name: "Ana",
      team_id: "t1",
    });
  });

  it("returns the patch untouched without preserve list", () => {
    expect(omitPreservedFields(patch, undefined)).toBe(patch);
    expect(omitPreservedFields(patch, [])).toBe(patch);
  });
});

describe("updatePlayerSchema — preserve_fields", () => {
  const base = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    first_name: "Ana",
    last_name: "Pérez",
    birth_date: "2012-05-10",
    dni: "12345678Z",
    season: "2026-27",
    address_street_type: "calle",
    address_street: "Real",
    address_number: "1",
    address_postal_code: "38300",
    address_municipality: "La Orotava",
    address_province: "Santa Cruz de Tenerife",
    contacts: [
      {
        full_name: "Madre",
        relationship: "madre",
        phone: "600111222",
        email: "madre@club.test",
        is_primary: true,
      },
    ],
  };

  it("accepts known fields and keeps them in the parsed data", () => {
    const parsed = updatePlayerSchema.safeParse({
      ...base,
      preserve_fields: ["in_whatsapp_group", "is_active"],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.preserve_fields).toEqual(["in_whatsapp_group", "is_active"]);
    }
  });

  it("rejects unknown column names", () => {
    const parsed = updatePlayerSchema.safeParse({ ...base, preserve_fields: ["full_name"] });
    expect(parsed.success).toBe(false);
  });
});
