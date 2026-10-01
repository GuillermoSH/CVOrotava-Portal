import { describe, expect, it } from "vitest";

import { quickCreatePlayerSchema } from "@/lib/roster/schemas";

describe("quickCreatePlayerSchema", () => {
  const valid = {
    first_name: "Lucía",
    last_name: "García Pérez",
    season: "2026-27",
  };

  it("accepts just name, surname and season (no team, no dni, no contacts)", () => {
    const parsed = quickCreatePlayerSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.team_id).toBeNull();
  });

  it("accepts an optional team_id", () => {
    const parsed = quickCreatePlayerSchema.safeParse({
      ...valid,
      team_id: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(parsed.success).toBe(true);
  });

  it("treats an empty-string team_id as no team", () => {
    const parsed = quickCreatePlayerSchema.safeParse({ ...valid, team_id: "" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.team_id).toBeNull();
  });

  it("rejects a missing first name", () => {
    expect(quickCreatePlayerSchema.safeParse({ ...valid, first_name: "  " }).success).toBe(false);
  });

  it("rejects a missing last name", () => {
    expect(quickCreatePlayerSchema.safeParse({ ...valid, last_name: "" }).success).toBe(false);
  });

  it("rejects a missing season", () => {
    const withoutSeason: Record<string, unknown> = { ...valid };
    delete withoutSeason.season;
    expect(quickCreatePlayerSchema.safeParse(withoutSeason).success).toBe(false);
  });

  it("does not require dni, birth_date, address or contacts", () => {
    const parsed = quickCreatePlayerSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });
});
