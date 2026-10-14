import { beforeEach, describe, expect, it, vi } from "vitest";

const listPlayersPage = vi.fn();
const getCachedTeams = vi.fn();
const getCachedInactiveCount = vi.fn();

vi.mock("@/lib/roster/repository/client", () => ({
  getRosterDb: vi.fn(async () => ({})),
}));

vi.mock("@/lib/roster/repository/players", () => ({
  getPlayerById: vi.fn(),
  listPlayersPage: (...args: unknown[]) => listPlayersPage(...args),
  listPlayersWithPrimaryPhone: vi.fn(),
}));

vi.mock("@/lib/roster/cached", () => ({
  getCachedTeams: (...args: unknown[]) => getCachedTeams(...args),
  getCachedInactiveCount: (...args: unknown[]) => getCachedInactiveCount(...args),
}));

import { getPlayersListSnapshot, getTeamsSnapshot } from "@/lib/roster/snapshots";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPlayersListSnapshot", () => {
  it("starts page, teams and inactive count at the same time", async () => {
    const page = deferred<unknown>();
    const teams = deferred<unknown>();
    const inactive = deferred<unknown>();
    listPlayersPage.mockReturnValue(page.promise);
    getCachedTeams.mockReturnValue(teams.promise);
    getCachedInactiveCount.mockReturnValue(inactive.promise);

    const pending = getPlayersListSnapshot({ season: "2026-27", page: 1, pageSize: 50 });
    // Deja correr los microtasks: si fueran en serie, solo la primera estaría llamada.
    await Promise.resolve();
    await Promise.resolve();

    expect(listPlayersPage).toHaveBeenCalledTimes(1);
    expect(getCachedTeams).toHaveBeenCalledTimes(1);
    expect(getCachedInactiveCount).toHaveBeenCalledTimes(1);

    page.resolve({ players: [], total: 0, page: 1, pageSize: 50 });
    teams.resolve([]);
    inactive.resolve(3);

    const snapshot = await pending;
    expect(snapshot.inactiveCount).toBe(3);
    expect(snapshot.season).toBe("2026-27");
  });

  it("asks the cache for teams of the requested season only once", async () => {
    listPlayersPage.mockResolvedValue({ players: [], total: 0, page: 1, pageSize: 50 });
    getCachedTeams.mockResolvedValue([]);
    getCachedInactiveCount.mockResolvedValue(0);

    await getPlayersListSnapshot({ season: "2025-26" });

    expect(getCachedTeams).toHaveBeenCalledTimes(1);
    expect(getCachedTeams).toHaveBeenCalledWith("2025-26");
    expect(getCachedInactiveCount).toHaveBeenCalledWith("2025-26");
  });
});

describe("getTeamsSnapshot", () => {
  it("is served from the cache", async () => {
    getCachedTeams.mockResolvedValue([{ id: "t1" }]);
    await expect(getTeamsSnapshot("2026-27")).resolves.toEqual([{ id: "t1" }]);
    expect(getCachedTeams).toHaveBeenCalledWith("2026-27");
  });
});
