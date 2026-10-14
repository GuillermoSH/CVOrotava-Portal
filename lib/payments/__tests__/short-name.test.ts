import { describe, expect, it } from "vitest";

import { shortPlayerName } from "@/lib/payments/short-name";

describe("shortPlayerName", () => {
  it("keeps the first name and the first surname", () => {
    expect(
      shortPlayerName({
        full_name: "Valeria Isabella Marín Lucas",
        first_name: "Valeria Isabella",
        last_name: "Marín Lucas",
      }),
    ).toBe("Valeria Marín");
  });

  it("keeps surname particles together", () => {
    expect(
      shortPlayerName({ full_name: "Ana de la Cruz Pérez", first_name: "Ana", last_name: "de la Cruz Pérez" }),
    ).toBe("Ana de la Cruz");
    expect(
      shortPlayerName({ full_name: "Luis del Castillo", first_name: "Luis", last_name: "del Castillo" }),
    ).toBe("Luis del Castillo");
  });

  it("works with a single surname", () => {
    expect(
      shortPlayerName({ full_name: "Yara Machado", first_name: "Yara", last_name: "Machado" }),
    ).toBe("Yara Machado");
  });

  it("falls back to the first two words when first/last name are missing", () => {
    expect(shortPlayerName({ full_name: "Yasiel Fragoso Rodríguez" })).toBe("Yasiel Fragoso");
    expect(shortPlayerName({ full_name: "Madonna" })).toBe("Madonna");
  });

  it("keeps the first name when there is no surname", () => {
    expect(shortPlayerName({ full_name: "Pelé", first_name: "Pelé", last_name: "" })).toBe("Pelé");
  });
});
