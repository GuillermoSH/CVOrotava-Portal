import { describe, expect, it } from "vitest";

import { buildWhatsAppEntries, markInWhatsappGroup, normalizePhone } from "@/lib/roster/whatsapp";
import type { PlayerListItem } from "@/lib/types/db";

function player(partial: Partial<PlayerListItem> & { id: string }): PlayerListItem {
  return {
    full_name: partial.id,
    first_name: partial.id,
    last_name: "",
    birth_date: null,
    team_id: "t1",
    user_id: null,
    season: "2026-27",
    is_active: true,
    gender: null,
    dni: null,
    license_completed: false,
    registration_papers_received: false,
    docs_delivered_to_family: false,
    docs_delivered_at: null,
    photo_taken: false,
    photo_consent: false,
    photo_path: null,
    in_whatsapp_group: false,
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
    team: { id: "t1", name: "Cadete A", category: "cadete", gender: "female", season: "2026-27" },
    primary_phone: "600 111 222",
    primary_email: null,
    ...partial,
  };
}

const FILTERS = { category: "cadete", teamId: "all", onlyMissingWhatsapp: true };

describe("normalizePhone", () => {
  it("keeps digits and plus sign only", () => {
    expect(normalizePhone(" +34 600-111 222 ")).toBe("+34600111222");
  });
});

describe("buildWhatsAppEntries", () => {
  it("lists active players of the category with a phone", () => {
    const entries = buildWhatsAppEntries(
      [
        player({ id: "a" }),
        player({ id: "inactive", is_active: false }),
        player({ id: "no-phone", primary_phone: null }),
        player({ id: "other", team: { id: "t2", name: "Senior", category: "senior", gender: "male", season: "2026-27" } }),
      ],
      FILTERS,
    );
    expect(entries.map((e) => e.playerId)).toEqual(["a"]);
  });

  it("hides players already in the group when only missing are requested", () => {
    const players = [player({ id: "a" }), player({ id: "b", in_whatsapp_group: true })];
    expect(buildWhatsAppEntries(players, FILTERS).map((e) => e.playerId)).toEqual(["a"]);
    expect(
      buildWhatsAppEntries(players, { ...FILTERS, onlyMissingWhatsapp: false }).map(
        (e) => e.playerId,
      ),
    ).toEqual(["a", "b"]);
  });
});

describe("markInWhatsappGroup", () => {
  it("marks only the given players", () => {
    const list = [player({ id: "a" }), player({ id: "b" }), player({ id: "c" })];
    const next = markInWhatsappGroup(list, ["a", "c"]);
    expect(next.map((p) => p.in_whatsapp_group)).toEqual([true, false, true]);
  });

  it("does not mutate the original list and keeps untouched references", () => {
    const list = [player({ id: "a" }), player({ id: "b" })];
    const next = markInWhatsappGroup(list, ["a"]);
    expect(list[0].in_whatsapp_group).toBe(false);
    expect(next[1]).toBe(list[1]);
  });

  it("is idempotent for players already in the group", () => {
    const list = [player({ id: "a", in_whatsapp_group: true })];
    const next = markInWhatsappGroup(list, ["a"]);
    expect(next[0]).toBe(list[0]);
  });

  it("removes a confirmed player from the pending queue (regression: no repeat assign)", () => {
    const stale = [player({ id: "a" }), player({ id: "b" })];
    expect(buildWhatsAppEntries(stale, FILTERS).map((e) => e.playerId)).toEqual(["a", "b"]);

    const fresh = markInWhatsappGroup(stale, ["a"]);
    expect(buildWhatsAppEntries(fresh, FILTERS).map((e) => e.playerId)).toEqual(["b"]);
  });
});
