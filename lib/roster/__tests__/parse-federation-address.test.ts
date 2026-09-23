import { describe, expect, it } from "vitest";

import { parseFederationAddress } from "@/lib/roster/parse-federation-address";

describe("parseFederationAddress (pessimistic)", () => {
  it("discards Dirección=Española as junk (not a street)", () => {
    const result = parseFederationAddress({
      domicilio: "",
      direccion: "Española",
      postalCode: "38400",
      localidad: "Puerto de la Cruz",
      isla: "Tenerife",
    });

    expect(result.structured).toBe(false);
    expect(result.street).toBeUndefined();
    expect(result.street_type).toBeUndefined();
    expect(result.number).toBeUndefined();
    expect(result.address).toBeUndefined();
    expect(result.missingFields).toEqual(
      expect.arrayContaining(["Tipo de vía", "Vía", "Número"]),
    );
  });

  it("does not structure municipality when Localidad contains ?", () => {
    const result = parseFederationAddress({
      domicilio: "Camino Atravesado 1",
      postalCode: "38400",
      localidad: "P?uerto de la Cruz",
      isla: "Tenerife",
    });

    expect(result.municipality).toBeUndefined();
    expect(result.missingFields).toContain("Municipio");
    // Doubt on street without clear type+number → not inventing structured via
    expect(result.structured).toBe(false);
  });

  it("structures a clear C/ … nº… domicilio with CP and localidad", () => {
    const result = parseFederationAddress({
      domicilio: "C/ El lance nº85",
      postalCode: "38414",
      localidad: "Los Realejos",
      isla: "Tenerife",
    });

    expect(result.structured).toBe(true);
    expect(result.street_type).toBe("calle");
    expect(result.street?.toLowerCase()).toContain("lance");
    expect(result.number).toBe("85");
    expect(result.postal_code).toBe("38414");
    expect(result.municipality).toBe("Los Realejos");
    expect(result.province).toBe("Santa Cruz de Tenerife");
    expect(result.missingFields).toEqual([]);
  });

  it("prefers Domicilio over Dirección when both present", () => {
    const result = parseFederationAddress({
      domicilio: "Avda. Los Pesqueros N9",
      direccion: "Española",
      postalCode: "38400",
      localidad: "Puerto de la Cruz",
      isla: "Tenerife",
    });

    expect(result.street_type).toBe("avenida");
    expect(result.number).toBe("9");
    expect(result.address).toBeUndefined();
  });

  it("uses Dirección only when Domicilio empty and value looks like a street", () => {
    const result = parseFederationAddress({
      domicilio: "",
      direccion: "C/ San Francisco Nº10 Portal 2",
      postalCode: "38410",
      localidad: "Los Realejos",
      isla: "Tenerife",
    });

    expect(result.street_type).toBe("calle");
    expect(result.number).toBe("10");
    expect(result.door?.toLowerCase()).toContain("portal");
  });

  it("on doubt keeps missingFields and does not invent street parts", () => {
    const result = parseFederationAddress({
      domicilio: "El Toscal, Edf. Gama",
      postalCode: "38417",
      localidad: "Los Realejos",
      isla: "Tenerife",
    });

    expect(result.structured).toBe(false);
    expect(result.street_type).toBeUndefined();
    expect(result.street).toBeUndefined();
    expect(result.number).toBeUndefined();
    expect(result.missingFields.length).toBeGreaterThan(0);
    // May keep raw address if it looks like a domicile
    if (result.address) {
      expect(result.address).toContain("Toscal");
    }
  });
});
