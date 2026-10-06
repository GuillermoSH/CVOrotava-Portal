import {
  serializePlayerListSearchParams,
  type PlayerFilterState,
} from "@/lib/roster/player-filters";

const KEY_PREFIX = "cvo.playersListScroll:";

export type PlayerListScrollState = {
  scrollTop: number;
};

function storageKey(filterState: PlayerFilterState): string {
  return `${KEY_PREFIX}${serializePlayerListSearchParams(filterState).toString()}`;
}

/** Lee la posición de scroll guardada para una combinación de filtros. */
export function readPlayerListScroll(filterState: PlayerFilterState): PlayerListScrollState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(filterState));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlayerListScrollState> & {
      page?: number;
      pageSize?: number;
      sortDir?: string;
    };
    if (typeof parsed.scrollTop !== "number") return null;
    return { scrollTop: parsed.scrollTop };
  } catch {
    return null;
  }
}

/** Guarda la posición de scroll para una combinación de filtros. */
export function writePlayerListScroll(
  filterState: PlayerFilterState,
  state: PlayerListScrollState,
) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey(filterState), JSON.stringify(state));
  } catch {
    // Cuota / modo privado — mejora de UX no crítica, se ignora.
  }
}
