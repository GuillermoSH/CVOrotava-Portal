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
import { searchIncludes } from "@/lib/text/search";
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
  | "no_photo_consent"
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
  no_photo_consent: "No autoriza fotos",
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
  "no_photo_consent",
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

export type PlayerFacetKey = "category" | "gender" | "team" | "checklist";

/** Valor de la faceta `team` para «Sin equipo». */
export const TEAM_FACET_NONE = "none";

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
    case "no_photo_consent":
      return !player.photo_consent;
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

/** Cada grupo admite varios valores (se combinan con «o»); los grupos entre sí con «y». */
export function facetValues(facets: PlayerFacet[], key: PlayerFacetKey): string[] {
  return facets.filter((f) => f.key === key).map((f) => f.value);
}

function matchesQuery(player: PlayerListItem, query: string): boolean {
  return searchIncludes(
    [
      formatPlayerName(player),
      player.full_name,
      player.dni ?? "",
      player.team?.name ?? "",
      player.team ? formatTeamCategory(player.team.category) : "",
      player.primary_phone ?? "",
      player.primary_email ?? "",
    ].join(" "),
    query,
  );
}

export function applyPlayerFacets(
  players: PlayerListItem[],
  { query, facets, statusFilter }: PlayerFilterState,
  context: PlayerFilterContext = {},
): PlayerListItem[] {
  const categories = facetValues(facets, "category");
  const genders = facetValues(facets, "gender");
  const teamValues = facetValues(facets, "team");
  const checklists = facetValues(facets, "checklist") as ChecklistFilter[];
  const q = query.trim();

  return players.filter((player) => {
    if (statusFilter === "active" && !player.is_active && !q) return false;
    if (categories.length > 0 && !categories.includes(player.team?.category ?? "")) return false;
    if (genders.length > 0 && !genders.includes(effectivePlayerGender(player) ?? "")) return false;
    if (teamValues.length > 0) {
      const teamKey = player.team_id ?? TEAM_FACET_NONE;
      if (!teamValues.includes(teamKey)) return false;
    }
    if (
      checklists.length > 0 &&
      !checklists.some((filter) => matchesChecklistFilter(player, filter, context))
    ) {
      return false;
    }
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

/** Añade el valor si no estaba; si ya estaba, lo quita. */
export function togglePlayerFacet(facets: PlayerFacet[], next: PlayerFacet): PlayerFacet[] {
  const exists = facets.some((f) => f.key === next.key && f.value === next.value);
  if (exists) return facets.filter((f) => !(f.key === next.key && f.value === next.value));
  return [...facets, next];
}

/** Quita el grupo entero (todos los valores de esa clave). */
export function removePlayerFacet(facets: PlayerFacet[], key: PlayerFacetKey): PlayerFacet[] {
  return facets.filter((f) => f.key !== key);
}

/** Quita los equipos elegidos que ya no encajan con categoría/género. */
export function reconcileTeamFacet(facets: PlayerFacet[], teams: Team[]): PlayerFacet[] {
  const categories = facetValues(facets, "category");
  const genders = facetValues(facets, "gender");

  return facets.filter((facet) => {
    if (facet.key !== "team" || facet.value === TEAM_FACET_NONE) return true;
    const team = teams.find((t) => t.id === facet.value);
    if (!team) return false;
    if (categories.length > 0 && !categories.includes(team.category)) return false;
    if (genders.length > 0 && !genders.some((g) => teamMatchesGenderFacet(team, g))) return false;
    return true;
  });
}

export function teamsMatchingFacets(teams: Team[], facets: PlayerFacet[]): Team[] {
  const categories = facetValues(facets, "category");
  const genders = facetValues(facets, "gender");
  return teams.filter((team) => {
    if (categories.length > 0 && !categories.includes(team.category)) return false;
    if (genders.length > 0 && !genders.some((g) => teamMatchesGenderFacet(team, g))) return false;
    return true;
  });
}

export const PLAYER_FACET_GROUP_LABELS: Record<PlayerFacetKey, string> = {
  category: "Categoría",
  gender: "Género",
  team: "Equipo",
  checklist: "Alta",
};

/** Etiqueta de un valor concreto (sin el nombre del grupo). */
export function formatFacetValueLabel(
  key: PlayerFacetKey,
  value: string,
  teams: Team[],
): string {
  switch (key) {
    case "category":
      return formatTeamCategory(value);
    case "gender":
      return TEAM_GENDER_LABELS[value as TeamGender] ?? value;
    case "team":
      if (value === TEAM_FACET_NONE) return "Sin equipo";
      return teams.find((t) => t.id === value)?.name ?? value;
    case "checklist":
      return CHECKLIST_FILTER_LABELS[value as ChecklistFilter] ?? value;
    default:
      return value;
  }
}

function makeFacet(key: PlayerFacetKey, value: string, teams: Team[]): PlayerFacet {
  return { key, value, label: formatFacetValueLabel(key, value, teams) };
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

/** Valores separados por coma de un parámetro (sin vacíos ni repetidos). */
function listParam(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
  key: string,
): string[] {
  const raw = firstParam(params, key);
  if (!raw) return [];
  return [...new Set(raw.split(",").map((v) => v.trim()).filter(Boolean))];
}

export function serializePlayerListSearchParams(
  state: PlayerFilterState,
  paging?: Partial<PlayerListPagingState> | null,
): URLSearchParams {
  const params = new URLSearchParams();
  const q = state.query.trim();
  if (q) params.set("q", q);

  for (const key of ["category", "gender", "team", "checklist"] as const) {
    const values = facetValues(state.facets, key);
    if (values.length > 0) params.set(key, values.join(","));
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

  for (const value of listParam(params, "category")) {
    if ((TEAM_CATEGORIES as readonly string[]).includes(value)) {
      facets.push(makeFacet("category", value, teams));
    }
  }

  for (const value of listParam(params, "gender")) {
    if ((TEAM_GENDERS as readonly string[]).includes(value)) {
      facets.push(makeFacet("gender", value, teams));
    }
  }

  const teamValues = listParam(params, "team");
  // Enlaces antiguos: ?unassigned=1
  const legacyUnassigned = firstParam(params, "unassigned");
  if (legacyUnassigned === "1" || legacyUnassigned === "true") teamValues.push(TEAM_FACET_NONE);
  for (const value of new Set(teamValues)) {
    facets.push(makeFacet("team", value, teams));
  }

  for (const value of listParam(params, "checklist")) {
    if (value in CHECKLIST_FILTER_LABELS) {
      facets.push(makeFacet("checklist", value, teams));
    }
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
export function playerFilterStateToListFilters(state: PlayerFilterState): {
  query: string;
  statusFilter: "active" | "all";
  categories?: string[];
  genders?: string[];
  teamIds?: string[];
  unassigned?: boolean;
  checklists?: ChecklistFilter[];
} {
  const categories = facetValues(state.facets, "category");
  const genders = facetValues(state.facets, "gender");
  const teamValues = facetValues(state.facets, "team");
  const teamIds = teamValues.filter((v) => v !== TEAM_FACET_NONE);
  const unassigned = teamValues.includes(TEAM_FACET_NONE);
  const checklists = facetValues(state.facets, "checklist").filter(
    (v): v is ChecklistFilter => v in CHECKLIST_FILTER_LABELS,
  );

  return {
    query: state.query,
    statusFilter: state.statusFilter,
    categories: categories.length > 0 ? categories : undefined,
    genders: genders.length > 0 ? genders : undefined,
    teamIds: teamIds.length > 0 ? teamIds : undefined,
    unassigned: unassigned || undefined,
    checklists: checklists.length > 0 ? checklists : undefined,
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
