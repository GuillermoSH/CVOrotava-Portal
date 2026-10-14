import { describe, expect, it, vi } from "vitest";

import { mapPlayerListItem, type PlayerRow } from "@/lib/roster/mappers";
import { listPlayersPage } from "@/lib/roster/repository/players";
import type { RosterDb } from "@/lib/roster/repository/client";

function playerRow(partial: Partial<PlayerRow> = {}): PlayerRow {
  return {
    id: "p1",
    full_name: "Ana Pérez",
    birth_date: null,
    team_id: null,
    user_id: null,
    season: "2026-27",
    is_active: true,
    ...partial,
  };
}

describe("mapPlayerListItem — contactos embebidos", () => {
  it("uses the primary contact for phone and email", () => {
    const item = mapPlayerListItem({
      ...playerRow(),
      contacts: [
        { phone: "600000001", email: "otro@club.test", is_primary: false },
        { phone: " 600000002 ", email: " madre@club.test ", is_primary: true },
      ],
    });
    expect(item.primary_phone).toBe("600000002");
    expect(item.primary_email).toBe("madre@club.test");
  });

  it("falls back to the first contact when none is primary", () => {
    const item = mapPlayerListItem({
      ...playerRow(),
      contacts: [{ phone: "600000009", email: null, is_primary: false }],
    });
    expect(item.primary_phone).toBe("600000009");
    expect(item.primary_email).toBeNull();
  });

  it("returns null phone and email without contacts", () => {
    expect(mapPlayerListItem(playerRow()).primary_phone).toBeNull();
    expect(mapPlayerListItem({ ...playerRow(), contacts: [] }).primary_email).toBeNull();
    expect(mapPlayerListItem({ ...playerRow(), contacts: null }).primary_phone).toBeNull();
  });

  it("treats blank phone strings as missing", () => {
    const item = mapPlayerListItem({
      ...playerRow(),
      contacts: [{ phone: "   ", email: "  ", is_primary: true }],
    });
    expect(item.primary_phone).toBeNull();
    expect(item.primary_email).toBeNull();
  });

  it("keeps the rest of the player mapping", () => {
    const item = mapPlayerListItem({ ...playerRow({ full_name: "Luis Mora" }), contacts: [] });
    expect(item.full_name).toBe("Luis Mora");
    expect(item.team).toBeNull();
  });
});

/** Cliente falso encadenable: registra cada `from()` y los `select()`. */
function fakeDb(rows: unknown[]) {
  const calls: { table: string; select?: string }[] = [];
  const builder = (table: string) => {
    const entry: { table: string; select?: string } = { table };
    calls.push(entry);
    const chain: Record<string, unknown> = {};
    const self = new Proxy(chain, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: (value: unknown) => void) =>
            resolve({ data: rows, error: null, count: rows.length });
        }
        if (prop === "select") {
          return (columns: string) => {
            entry.select = columns;
            return self;
          };
        }
        return () => self;
      },
    });
    return self;
  };
  const db = { from: vi.fn((table: string) => builder(table)) };
  return { db: db as unknown as RosterDb, calls };
}

describe("listPlayersPage — una sola consulta", () => {
  it("embeds contacts in the players select instead of querying player_contacts", async () => {
    const { db, calls } = fakeDb([
      {
        ...playerRow(),
        contacts: [{ phone: "600111222", email: "x@club.test", is_primary: true }],
      },
    ]);

    const result = await listPlayersPage(db, { season: "2026-27", page: 1, pageSize: 50 });

    expect(calls).toHaveLength(1);
    expect(calls[0].table).toBe("players");
    expect(calls[0].select).toContain("contacts:player_contacts(");
    expect(result.players[0].primary_phone).toBe("600111222");
    expect(result.total).toBe(1);
  });

  it("also uses a single query on the in-memory path (todos / facetas)", async () => {
    const { db, calls } = fakeDb([
      { ...playerRow({ id: "a" }), contacts: [{ phone: "1", email: null, is_primary: true }] },
      { ...playerRow({ id: "b" }), contacts: [] },
    ]);

    const result = await listPlayersPage(db, { season: "2026-27", pageSize: 0 });

    expect(calls).toHaveLength(1);
    expect(result.players.map((p) => p.id)).toEqual(["a", "b"]);
    expect(result.players[0].primary_phone).toBe("1");
  });
});
