import { appRoutes } from "@/lib/constants";
import {
  TEAM_CATEGORIES,
  TEAM_GENDER_LABELS,
  TEAM_GENDERS,
  effectivePlayerGender,
  formatPlayerName,
  formatTeamCategory,
  type TeamGender,
} from "@/lib/roster/constants";
import { getPlayerOnboardingStatus } from "@/lib/roster/onboarding";
import { isPlayerProfileIncomplete } from "@/lib/roster/profile-completeness";
import type { PlayerListItem, Team } from "@/lib/types/db";

function teamMatchesGenderFacet(team: Team, gender: string): boolean {
  if (team.gender === gender) return true;
  // En equipos mixtos hay jugadores de ambos sexos.
  if ((gender === "male" || gender === "female") && team.gender === "mixed") return true;
  return false;
}

export type ChecklistFilter =
  | "complete"
  | "incomplete_profile"
  | "missing_papers"
  | "missing_docs"
  | "missing_photo"
  | "missing_license"
  | "license_blocked"
  | "missing_matricula"
  | "missing_whatsapp";

export const CHECKLIST_FILTER_LABELS: Record<ChecklistFilter, string> = {
  complete: "Alta completa",
  incomplete_profile: "Ficha incompleta",
  missing_docs: "Falta docs",
  missing_papers: "Falta papeles",
  missing_photo: "Falta foto",
  missing_license: "Falta licencia",
  license_blocked: "Licencia bloqueada (papeles/foto)",
  missing_matricula: "Sin matrícula",
  missing_whatsapp: "Sin WhatsApp",
};

export const CHECKLIST_FILTER_ORDER: ChecklistFilter[] = [
  "complete",
  "incomplete_profile",
  "missing_docs",
  "missing_papers",
  "missing_photo",
  "missing_license",
  "license_blocked",
  "missing_matricula",
  "missing_whatsapp",
];

/** Datos externos (de otros módulos) que algunos filtros de checklist necesitan. */
export type PlayerFilterContext = {
  /** player_id con Matrícula ya pagada esta temporada (lib/payments/repository/payments.ts). */
  matriculaPaidPlayerIds?: ReadonlySet<string>;
};

export type PlayerFacetKey = "category" | "gender" | "team" | "checklist" | "unassigned";

export type PlayerFacet = {
  key: PlayerFacetKey;
  value: string;
  label: string;
};

export type PlayerFilterState = {
  query: string;
  facets: PlayerFacet[];
  statusFilter: "active" | "all";
};

export type PlayerSortDir = "asc" | "desc";

/** Paginación / orden en URL (además de filtros). */
export type PlayerListPagingState = {
  page: number;
  pageSize: number;
  sortDir: PlayerSortDir;
};

export const PLAYER_LIST_PAGE_SIZES = [25, 50, 100, 0] as const;
export type PlayerListPageSize = (typeof PLAYER_LIST_PAGE_SIZES)[number];

export type PlayerListUrlState = PlayerFilterState & PlayerListPagingState;

export function matchesChecklistFilter(
  player: PlayerListItem,
  filter: ChecklistFilter,
  context: PlayerFilterContext = {},
): boolean {
  const status = getPlayerOnboardingStatus(player);
  switch (filter) {
    case "complete":
      return status.isComplete;
    case "incomplete_profile":
      return isPlayerProfileIncomplete(player);
    case "missing_papers":
      return !player.registration_papers_received;
    case "missing_docs":
      return !player.docs_delivered_to_family;
    case "missing_photo":
      return !player.photo_taken;
    case "missing_license":
      return !player.license_completed;
    case "license_blocked":
      return (
        !player.license_completed &&
        (!player.registration_papers_received || !player.photo_taken)
      );
    case "missing_matricula":
      return !(context.matriculaPaidPlayerIds?.has(player.id) ?? false);
    case "missing_whatsapp":
      return !player.in_whatsapp_group;
    default:
      return true;
  }
}

function facetValue(facets: PlayerFacet[], key: PlayerFacetKey): string | undefined {
  return facets.find((f) => f.key === key)?.value;
}

function matchesQuery(player: PlayerListItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    formatPlayerName(player),
    player.full_name,
    player.dni ?? "",
    player.team?.name ?? "",
    player.team ? formatTeamCategory(player.team.category) : "",
    player.primary_phone ?? "",
    player.primary_email ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function applyPlayerFacets(
  players: PlayerListItem[],
  { query, facets, statusFilter }: PlayerFilterState,
  context: PlayerFilterContext = {},
): PlayerListItem[] {
  const category = facetValue(facets, "category");
  const gender = facetValue(facets, "gender");
  const teamId = facetValue(facets, "team");
  const checklist = facetValue(facets, "checklist") as ChecklistFilter | undefined;
  const unassigned = facetValue(facets, "unassigned") === "true";
  const q = query.trim();

  return players.filter((player) => {
    if (statusFilter === "active" && !player.is_active && !q) return false;
    if (category && player.team?.category !== category) return false;
    if (gender && effectivePlayerGender(player) !== gender) return false;
    if (unassigned && player.team_id !== null) return false;
    if (teamId && player.team_id !== teamId) return false;
    if (checklist && !matchesChecklistFilter(player, checklist, context)) return false;
    return matchesQuery(player, query);
  });
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, "es", { sensitivity: "base", numeric: true });
}

/** Orden por nombre de pila (luego apellido como desempate). */
export function sortPlayersByFirstName(
  players: PlayerListItem[],
  dir: PlayerSortDir,
): PlayerListItem[] {
  const factor = dir === "asc" ? 1 : -1;
  return [...players].sort((a, b) => {
    let cmp = compareText(a.first_name, b.first_name);
    if (cmp === 0) cmp = compareText(a.last_name, b.last_name);
    if (cmp === 0) return a.id.localeCompare(b.id);
    return cmp * factor;
  });
}

/** Pool before checklist facet — used for checklist option counts. */
export function applyPlayerFacetsExceptChecklist(
  players: PlayerListItem[],
  state: PlayerFilterState,
  context: PlayerFilterContext = {},
): PlayerListItem[] {
  return applyPlayerFacets(
    players,
    {
      ...state,
      facets: state.facets.filter((f) => f.key !== "checklist"),
    },
    context,
  );
}

export function upsertPlayerFacet(facets: PlayerFacet[], next: PlayerFacet): PlayerFacet[] {
  let cleaned = facets.filter((f) => f.key !== next.key);

  if (next.key === "team") {
    cleaned = cleaned.filter((f) => f.key !== "unassigned");
  }
  if (next.key === "unassigned") {
    cleaned = cleaned.filter((f) => f.key !== "team");
  }

  return [...cleaned, next];
}

export function removePlayerFacet(facets: PlayerFacet[], key: PlayerFacetKey): PlayerFacet[] {
  return facets.filter((f) => f.key !== key);
}

/** Drop team facet if it no longer matches category/gender cascade. */
export function reconcileTeamFacet(facets: PlayerFacet[], teams: Team[]): PlayerFacet[] {
  const teamId = facetValue(facets, "team");
  if (!teamId) return facets;

  const team = teams.find((t) => t.id === teamId);
  if (!team) return removePlayerFacet(facets, "team");

  const category = facetValue(facets, "category");
  const gender = facetValue(facets, "gender");
  if (category && team.category !== category) return removePlayerFacet(facets, "team");
  if (gender && !teamMatchesGenderFacet(team, gender)) return removePlayerFacet(facets, "team");
  return facets;
}

export function teamsMatchingFacets(teams: Team[], facets: PlayerFacet[]): Team[] {
  const category = facetValue(facets, "category");
  const gender = facetValue(facets, "gender");
  return teams.filter((team) => {
    if (category && team.category !== category) return false;
    if (gender && !teamMatchesGenderFacet(team, gender)) return false;
    return true;
  });
}

function countInPool(pool: PlayerListItem[], predicate: (p: PlayerListItem) => boolean): number {
  return pool.filter(predicate).length;
}

export type FacetOption = { value: string; label: string; count?: number };

export function buildCategoryOptions(pool: PlayerListItem[]): FacetOption[] {
  return TEAM_CATEGORIES.map((category) => ({
    value: category,
    label: formatTeamCategory(category),
    count: countInPool(pool, (p) => p.team?.category === category),
  })).filter((opt) => (opt.count ?? 0) > 0);
}

export function buildGenderOptions(pool: PlayerListItem[]): FacetOption[] {
  return TEAM_GENDERS.map((gender) => ({
    value: gender,
    label: TEAM_GENDER_LABELS[gender as TeamGender],
    count: countInPool(pool, (p) => effectivePlayerGender(p) === gender),
  }));
}

export function buildTeamOptions(teams: Team[], pool: PlayerListItem[]): FacetOption[] {
  return teams.map((team) => ({
    value: team.id,
    label: team.name,
    count: countInPool(pool, (p) => p.team_id === team.id),
  }));
}

export function buildChecklistOptions(
  pool: PlayerListItem[],
  context: PlayerFilterContext = {},
): FacetOption[] {
  return CHECKLIST_FILTER_ORDER.map((filter) => ({
    value: filter,
    label: CHECKLIST_FILTER_LABELS[filter],
    count: countInPool(pool, (p) => matchesChecklistFilter(p, filter, context)),
  }));
}

export function buildUnassignedOption(pool: PlayerListItem[]): FacetOption {
  return {
    value: "true",
    label: "Sin equipo",
    count: countInPool(pool, (p) => p.team_id === null),
  };
}

export function formatFacetChipLabel(key: PlayerFacetKey, value: string, teams: Team[]): string {
  switch (key) {
    case "category":
      return `Categoría: ${formatTeamCategory(value)}`;
    case "gender":
      return `Género: ${TEAM_GENDER_LABELS[value as TeamGender] ?? value}`;
    case "team": {
      const team = teams.find((t) => t.id === value);
      return `Equipo: ${team?.name ?? value}`;
    }
    case "checklist":
      return `Alta: ${CHECKLIST_FILTER_LABELS[value as ChecklistFilter] ?? value}`;
    case "unassigned":
      return "Sin equipo";
    default:
      return value;
  }
}

function firstParam(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  if (params instanceof URLSearchParams) {
    const value = params.get(key);
    return value?.trim() || undefined;
  }
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

export function serializePlayerListSearchParams(
  state: PlayerFilterState,
  paging?: Partial<PlayerListPagingState> | null,
): URLSearchParams {
  const params = new URLSearchParams();
  const q = state.query.trim();
  if (q) params.set("q", q);

  for (const facet of state.facets) {
    if (facet.key === "unassigned") {
      if (facet.value === "true") params.set("unassigned", "1");
      continue;
    }
    if (facet.value) params.set(facet.key, facet.value);
  }

  if (state.statusFilter === "all") params.set("status", "all");

  if (paging) {
    const page = paging.page ?? 1;
    const pageSize = paging.pageSize ?? 50;
    const sortDir = paging.sortDir ?? "asc";
    if (page > 1) params.set("page", String(page));
    if (pageSize !== 50) params.set("pageSize", String(pageSize));
    if (sortDir === "desc") params.set("sort", "desc");
  }

  return params;
}

function parsePagingParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): PlayerListPagingState {
  const pageRaw = Number(firstParam(params, "page") ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;

  const pageSizeRaw = Number(firstParam(params, "pageSize") ?? "50");
  const pageSize = (PLAYER_LIST_PAGE_SIZES as readonly number[]).includes(pageSizeRaw)
    ? (pageSizeRaw as PlayerListPageSize)
    : 50;

  const sortRaw = firstParam(params, "sort");
  const sortDir: PlayerSortDir = sortRaw === "desc" ? "desc" : "asc";

  return { page, pageSize, sortDir };
}

export function parsePlayerListSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
  teams: Team[] = [],
): PlayerFilterState {
  const query = firstParam(params, "q") ?? "";
  const statusRaw = firstParam(params, "status");
  const statusFilter: "active" | "all" = statusRaw === "all" ? "all" : "active";

  const facets: PlayerFacet[] = [];

  const category = firstParam(params, "category");
  if (category && (TEAM_CATEGORIES as readonly string[]).includes(category)) {
    facets.push({
      key: "category",
      value: category,
      label: formatFacetChipLabel("category", category, teams),
    });
  }

  const gender = firstParam(params, "gender");
  if (gender && (TEAM_GENDERS as readonly string[]).includes(gender)) {
    facets.push({
      key: "gender",
      value: gender,
      label: formatFacetChipLabel("gender", gender, teams),
    });
  }

  const unassigned = firstParam(params, "unassigned");
  if (unassigned === "1" || unassigned === "true") {
    facets.push({
      key: "unassigned",
      value: "true",
      label: formatFacetChipLabel("unassigned", "true", teams),
    });
  } else {
    const teamId = firstParam(params, "team");
    if (teamId) {
      facets.push({
        key: "team",
        value: teamId,
        label: formatFacetChipLabel("team", teamId, teams),
      });
    }
  }

  const checklist = firstParam(params, "checklist");
  if (checklist && checklist in CHECKLIST_FILTER_LABELS) {
    facets.push({
      key: "checklist",
      value: checklist,
      label: formatFacetChipLabel("checklist", checklist, teams),
    });
  }

  return {
    query,
    facets: reconcileTeamFacet(facets, teams),
    statusFilter,
  };
}

export function parsePlayerListUrlState(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
  teams: Team[] = [],
): PlayerListUrlState {
  return {
    ...parsePlayerListSearchParams(params, teams),
    ...parsePagingParams(params),
  };
}

/** Facetas URL → filtros del repositorio. */
export function playerFilterStateToListFilters(
  state: PlayerFilterState,
): {
  query: string;
  statusFilter: "active" | "all";
  category?: string;
  gender?: string;
  teamId?: string;
  unassigned?: boolean;
  checklist?: ChecklistFilter;
} {
  const category = state.facets.find((f) => f.key === "category")?.value;
  const gender = state.facets.find((f) => f.key === "gender")?.value;
  const teamId = state.facets.find((f) => f.key === "team")?.value;
  const unassigned = state.facets.find((f) => f.key === "unassigned")?.value === "true";
  const checklistRaw = state.facets.find((f) => f.key === "checklist")?.value;
  const checklist =
    checklistRaw && checklistRaw in CHECKLIST_FILTER_LABELS
      ? (checklistRaw as ChecklistFilter)
      : undefined;

  return {
    query: state.query,
    statusFilter: state.statusFilter,
    category,
    gender,
    teamId: unassigned ? undefined : teamId,
    unassigned: unassigned || undefined,
    checklist,
  };
}

export function playersListHref(
  state?: PlayerFilterState | null,
  paging?: Partial<PlayerListPagingState> | null,
): string {
  if (!state) return appRoutes.players.list;
  const qs = serializePlayerListSearchParams(state, paging).toString();
  return qs ? `${appRoutes.players.list}?${qs}` : appRoutes.players.list;
}

export function playerDetailHref(
  id: string,
  state?: PlayerFilterState | null,
  paging?: Partial<PlayerListPagingState> | null,
): string {
  const base = appRoutes.players.detail(id);
  if (!state) return base;
  const qs = serializePlayerListSearchParams(state, paging).toString();
  return qs ? `${base}?${qs}` : base;
}

/** Compare filter query strings ignoring param order. */
export function playerListSearchEqual(a: string, b: string): boolean {
  const left = new URLSearchParams(a.startsWith("?") ? a.slice(1) : a);
  const right = new URLSearchParams(b.startsWith("?") ? b.slice(1) : b);
  const keys = new Set([...left.keys(), ...right.keys()]);
  for (const key of keys) {
    if (left.get(key) !== right.get(key)) return false;
  }
  return true;
}
