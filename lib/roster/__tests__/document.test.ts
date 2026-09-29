import { describe, expect, it } from "vitest";

import {
  isAcceptablePlayerDocument,
  isValidDniOrNie,
  looksLikeSpanishDocument,
} from "@/lib/roster/document";

describe("isAcceptablePlayerDocument", () => {
  it("accepts valid DNI/NIE and rejects wrong control letter", () => {
    expect(isAcceptablePlayerDocument("12345678Z")).toBe(true);
    expect(isAcceptablePlayerDocument("X1234567L")).toBe(true);
    expect(isAcceptablePlayerDocument("12345678A")).toBe(false);
    expect(looksLikeSpanishDocument("12345678A")).toBe(true);
    expect(isValidDniOrNie("12345678A")).toBe(false);
  });

  it("accepts foreign passport-like identifiers", () => {
    expect(isAcceptablePlayerDocument("PASAPORTEZZ")).toBe(true);
    expect(isAcceptablePlayerDocument("AB1234567")).toBe(true);
    expect(looksLikeSpanishDocument("AB1234567")).toBe(false);
  });

  it("rejects empty", () => {
    expect(isAcceptablePlayerDocument("")).toBe(false);
    expect(isAcceptablePlayerDocument("   ")).toBe(false);
  });
});
