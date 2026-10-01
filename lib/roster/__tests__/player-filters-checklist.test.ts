import { describe, expect, it } from "vitest";

import { matchesChecklistFilter } from "@/lib/roster/player-filters";
import type { PlayerListItem } from "@/lib/types/db";

function buildPlayer(overrides: Partial<PlayerListItem> = {}): PlayerListItem {
  return {
    id: "player-1",
    full_name: "Ana Pérez",
    first_name: "Ana",
    last_name: "Pérez",
    birth_date: "2012-01-01",
    team_id: null,
    user_id: null,
    season: "2026-27",
    is_active: true,
    gender: "female",
    dni: null,
    license_completed: true,
    registration_papers_received: true,
    docs_delivered_to_family: true,
    docs_delivered_at: null,
    photo_taken: true,
    photo_consent: true,
    photo_path: null,
    in_whatsapp_group: true,
    medical_notes: null,
    clothing_size: null,
    address: null,
    address_street_type: null,
    address_street: null,
    address_number: null,
    address_door: null,
    address_postal_code: null,
    address_municipality: null,
    address_province: null,
    birth_country: null,
    nationality: null,
    pays_extended_monthly: false,
    team: null,
    primary_phone: null,
    primary_email: null,
    ...overrides,
  };
}

describe("matchesChecklistFilter — license_blocked", () => {
  it("matches a player missing the license due to missing papers", () => {
    const player = buildPlayer({ license_completed: false, registration_papers_received: false });
    expect(matchesChecklistFilter(player, "license_blocked")).toBe(true);
  });

  it("matches a player missing the license due to missing photo", () => {
    const player = buildPlayer({ license_completed: false, photo_taken: false });
    expect(matchesChecklistFilter(player, "license_blocked")).toBe(true);
  });

  it("does not match a player missing the license for another reason (papers/photo already done)", () => {
    const player = buildPlayer({
      license_completed: false,
      registration_papers_received: true,
      photo_taken: true,
    });
    expect(matchesChecklistFilter(player, "license_blocked")).toBe(false);
  });

  it("does not match a player whose license is already done", () => {
    const player = buildPlayer({
      license_completed: true,
      registration_papers_received: false,
      photo_taken: false,
    });
    expect(matchesChecklistFilter(player, "license_blocked")).toBe(false);
  });
});

describe("matchesChecklistFilter — missing_matricula", () => {
  it("matches a player absent from the paid-matrícula set", () => {
    const player = buildPlayer({ id: "p1" });
    expect(
      matchesChecklistFilter(player, "missing_matricula", {
        matriculaPaidPlayerIds: new Set(["p2"]),
      }),
    ).toBe(true);
  });

  it("does not match a player present in the paid-matrícula set", () => {
    const player = buildPlayer({ id: "p1" });
    expect(
      matchesChecklistFilter(player, "missing_matricula", {
        matriculaPaidPlayerIds: new Set(["p1", "p2"]),
      }),
    ).toBe(false);
  });

  it("treats every player as missing when no context is given", () => {
    const player = buildPlayer({ id: "p1" });
    expect(matchesChecklistFilter(player, "missing_matricula")).toBe(true);
  });
});
