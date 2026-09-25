import {
  TEAM_CATEGORIES,
  TEAM_GENDER_LABELS,
  TEAM_GENDERS,
  formatPlayerName,
  formatTeamCategory,
  type TeamGender,
} from "@/lib/roster/constants";
import { getPlayerOnboardingStatus } from "@/lib/roster/onboarding";
import { isPlayerProfileIncomplete } from "@/lib/roster/profile-completeness";
import type { PlayerListItem, Team } from "@/lib/types/db";

export type ChecklistFilter =
  | "complete"
  | "incomplete_profile"
  | "missing_papers"
  | "missing_docs"
  | "missing_photo"
  | "missing_license"
  | "missing_whatsapp";

export const CHECKLIST_FILTER_LABELS: Record<ChecklistFilter, string> = {
  complete: "Alta completa",
  incomplete_profile: "Ficha incompleta",
  missing_docs: "Falta docs",
  missing_papers: "Falta papeles",
  missing_photo: "Falta foto",
  missing_license: "Falta licencia",
  missing_whatsapp: "Sin WhatsApp",
};

export const CHECKLIST_FILTER_ORDER: ChecklistFilter[] = [
  "complete",
  "incomplete_profile",
  "missing_docs",
  "missing_papers",
  "missing_photo",
  "missing_license",
  "missing_whatsapp",
];

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

export function matchesChecklistFilter(player: PlayerListItem, filter: ChecklistFilter): boolean {
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
    if (gender && player.team?.gender !== gender) return false;
    if (unassigned && player.team_id !== null) return false;
    if (teamId && player.team_id !== teamId) return false;
    if (checklist && !matchesChecklistFilter(player, checklist)) return false;
    return matchesQuery(player, query);
  });
}

export type PlayerSortDir = "asc" | "desc";

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
): PlayerListItem[] {
  return applyPlayerFacets(players, {
    ...state,
    facets: state.facets.filter((f) => f.key !== "checklist"),
  });
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
  if (gender && team.gender !== gender) return removePlayerFacet(facets, "team");
  return facets;
}

export function teamsMatchingFacets(teams: Team[], facets: PlayerFacet[]): Team[] {
  const category = facetValue(facets, "category");
  const gender = facetValue(facets, "gender");
  return teams.filter((team) => {
    if (category && team.category !== category) return false;
    if (gender && team.gender !== gender) return false;
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
    count: countInPool(pool, (p) => p.team?.gender === gender),
  }));
}

export function buildTeamOptions(teams: Team[], pool: PlayerListItem[]): FacetOption[] {
  return teams.map((team) => ({
    value: team.id,
    label: team.name,
    count: countInPool(pool, (p) => p.team_id === team.id),
  }));
}

export function buildChecklistOptions(pool: PlayerListItem[]): FacetOption[] {
  return CHECKLIST_FILTER_ORDER.map((filter) => ({
    value: filter,
    label: CHECKLIST_FILTER_LABELS[filter],
    count: countInPool(pool, (p) => matchesChecklistFilter(p, filter)),
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
