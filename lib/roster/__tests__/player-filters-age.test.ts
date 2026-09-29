import { describe, expect, it } from "vitest";

import { contactsForPlayerAge, isLegalAdult, usesSelfContact } from "@/lib/roster/age";
import { isoToEsDate, parseFlexibleDate } from "@/lib/roster/dates";
import {
  parsePlayerListSearchParams,
  playerDetailHref,
  playerListSearchEqual,
  playersListHref,
  serializePlayerListSearchParams,
  type PlayerFilterState,
} from "@/lib/roster/player-filters";
import type { Team } from "@/lib/types/db";

describe("usesSelfContact", () => {
  it("uses self contact for legal adults", () => {
    expect(usesSelfContact({ birthDate: "2000-01-15" })).toBe(true);
    expect(isLegalAdult("2000-01-15")).toBe(true);
  });

  it("uses family contact for minors outside junior", () => {
    expect(usesSelfContact({ birthDate: "2012-06-01", teamCategory: "cadete" })).toBe(false);
    expect(usesSelfContact({ birthDate: "2012-06-01" })).toBe(false);
  });

  it("uses self contact for junior category even under 18", () => {
    expect(usesSelfContact({ birthDate: "2009-11-01", teamCategory: "junior" })).toBe(true);
  });

  it("contactsForPlayerAge keeps jugador for junior minors", () => {
    const contacts = contactsForPlayerAge({
      birthDate: "2009-11-01",
      firstName: "Ana",
      lastName: "Pérez",
      teamCategory: "junior",
      contacts: [
        {
          full_name: "Madre",
          relationship: "madre",
          phone: "612345678",
          email: "a@example.com",
          is_primary: true,
        },
      ],
    });
    expect(contacts).toHaveLength(1);
    expect(contacts[0]?.relationship).toBe("jugador");
    expect(contacts[0]?.full_name).toBe("Ana Pérez");
    expect(contacts[0]?.phone).toBe("612345678");
  });
});

describe("dates ES", () => {
  it("converts ISO to DD/MM/AAAA", () => {
    expect(isoToEsDate("2014-03-12")).toBe("12/03/2014");
  });

  it("parses DD/MM/AAAA and ISO", () => {
    expect(parseFlexibleDate("12/03/2014")).toBe("2014-03-12");
    expect(parseFlexibleDate("2014-03-12")).toBe("2014-03-12");
    expect(parseFlexibleDate("")).toBeNull();
    expect(parseFlexibleDate("32/01/2014")).toBe("invalid");
  });
});

describe("player list URL filters", () => {
  const teams: Team[] = [
    {
      id: "team-1",
      name: "Infantil Femenino",
      category: "infantil",
      gender: "female",
      season: "2026-2027",
    },
  ];

  const state: PlayerFilterState = {
    query: "ana",
    facets: [
      { key: "category", value: "infantil", label: "Categoría: Infantil" },
      { key: "checklist", value: "missing_photo", label: "Alta: Falta foto" },
    ],
    statusFilter: "all",
  };

  it("round-trips serialize/parse", () => {
    const params = serializePlayerListSearchParams(state);
    expect(params.get("q")).toBe("ana");
    expect(params.get("category")).toBe("infantil");
    expect(params.get("checklist")).toBe("missing_photo");
    expect(params.get("status")).toBe("all");

    const parsed = parsePlayerListSearchParams(params, teams);
    expect(parsed.query).toBe("ana");
    expect(parsed.statusFilter).toBe("all");
    expect(parsed.facets.map((f) => `${f.key}:${f.value}`).sort()).toEqual([
      "category:infantil",
      "checklist:missing_photo",
    ]);
  });

  it("builds list and detail hrefs", () => {
    expect(playersListHref(state)).toContain("/admin/jugadores?");
    expect(playersListHref(state)).toContain("q=ana");
    expect(playerDetailHref("abc", state)).toMatch(/^\/admin\/jugadores\/abc\?/);
    expect(playersListHref({ query: "", facets: [], statusFilter: "active" })).toBe(
      "/admin/jugadores",
    );
  });

  it("compares search strings ignoring order", () => {
    expect(playerListSearchEqual("q=a&status=all", "status=all&q=a")).toBe(true);
    expect(playerListSearchEqual("q=a", "q=b")).toBe(false);
  });
});
