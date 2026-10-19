import { describe, expect, it } from "vitest";

import { normalizeSearchText, searchIncludes } from "@/lib/text/search";

describe("searchIncludes", () => {
  it("ignora tildes en ambos sentidos", () => {
    expect(searchIncludes("María Pérez", "maria")).toBe(true);
    expect(searchIncludes("Maria Perez", "maría")).toBe(true);
    expect(searchIncludes("Núñez", "nunez")).toBe(true);
  });

  it("ignora mayúsculas y trata la query vacía como coincidencia", () => {
    expect(searchIncludes("ANA", "ana")).toBe(true);
    expect(searchIncludes("Ana", "  ")).toBe(true);
    expect(searchIncludes("Ana", "luz")).toBe(false);
  });

  it("normaliza a minúsculas sin diacríticos", () => {
    expect(normalizeSearchText("ÁÉÍÓÚ ñ")).toBe("aeiou n");
  });
});
