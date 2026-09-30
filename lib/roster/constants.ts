export const TEAM_CATEGORIES = [
  "minivoley",
  "benjamin",
  "alevin",
  "infantil",
  "cadete",
  "juvenil",
  "junior",
  "aficionados",
  "senior",
] as const;

export type TeamCategory = (typeof TEAM_CATEGORIES)[number];

export const TEAM_CATEGORY_LABELS: Record<TeamCategory, string> = {
  minivoley: "Minivoley",
  benjamin: "Benjamín",
  alevin: "Alevín",
  infantil: "Infantil",
  cadete: "Cadete",
  juvenil: "Juvenil",
  junior: "Júnior",
  aficionados: "Aficionados",
  senior: "Sénior",
};

export const TEAM_GENDERS = ["female", "male", "mixed"] as const;
export type TeamGender = (typeof TEAM_GENDERS)[number];

export const TEAM_GENDER_LABELS: Record<TeamGender, string> = {
  female: "Femenino",
  male: "Masculino",
  mixed: "Mixto",
};

/** Sexo del jugador (no incluye mixto). */
export const PLAYER_GENDERS = ["female", "male"] as const;
export type PlayerGender = (typeof PLAYER_GENDERS)[number];

export const PLAYER_GENDER_LABELS: Record<PlayerGender, string> = {
  female: "Femenino",
  male: "Masculino",
};

/** Géneros ofrecidos al crear equipo según categoría (Mixto solo aficionados). */
export function teamGenderOptionsForCategory(category: string): readonly TeamGender[] {
  return category === "aficionados" ? TEAM_GENDERS : (["female", "male"] as const);
}

export function defaultTeamGenderForCategory(category: string): TeamGender {
  return category === "aficionados" ? "mixed" : "female";
}

/** Categorías base (minivoley–júnior) donde aplica la cuota mensual ampliada (30 €); en sénior/aficionados se ignora. */
export function appliesExtendedMonthlyFee(category: string | null | undefined): boolean {
  return category !== "senior" && category !== "aficionados";
}

/** Género efectivo para filtros: jugador, o el del equipo si falta. */
export function effectivePlayerGender(player: {
  gender?: string | null;
  team?: { gender?: string | null } | null;
}): string | null {
  return player.gender ?? player.team?.gender ?? null;
}

export const GUARDIAN_RELATIONSHIPS = ["madre", "padre", "tutor", "otro"] as const;
export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIPS)[number];

export const CONTACT_RELATIONSHIPS = [...GUARDIAN_RELATIONSHIPS, "jugador"] as const;
export type ContactRelationship = (typeof CONTACT_RELATIONSHIPS)[number];

export const GUARDIAN_RELATIONSHIP_LABELS: Record<GuardianRelationship, string> = {
  madre: "Madre",
  padre: "Padre",
  tutor: "Tutor/a",
  otro: "Otro",
};

export const CONTACT_RELATIONSHIP_LABELS: Record<ContactRelationship, string> = {
  ...GUARDIAN_RELATIONSHIP_LABELS,
  jugador: "El propio jugador",
};

export const STREET_TYPES = [
  "calle",
  "avenida",
  "carretera",
  "plaza",
  "paseo",
  "camino",
  "urbanizacion",
  "otro",
] as const;

export type StreetType = (typeof STREET_TYPES)[number];

export const STREET_TYPE_LABELS: Record<StreetType, string> = {
  calle: "Calle",
  avenida: "Avenida",
  carretera: "Carretera",
  plaza: "Plaza",
  paseo: "Paseo",
  camino: "Camino",
  urbanizacion: "Urbanización",
  otro: "Otro",
};

export const CANARY_PROVINCES = ["Santa Cruz de Tenerife", "Las Palmas"] as const;

export const DEFAULT_PLAYER_PROVINCE = CANARY_PROVINCES[0];

export const SPAIN_PROVINCES = [
  ...CANARY_PROVINCES,
  "A Coruña",
  "Álava",
  "Albacete",
  "Alicante",
  "Almería",
  "Asturias",
  "Ávila",
  "Badajoz",
  "Barcelona",
  "Burgos",
  "Cáceres",
  "Cádiz",
  "Cantabria",
  "Castellón",
  "Ceuta",
  "Ciudad Real",
  "Córdoba",
  "Cuenca",
  "Girona",
  "Granada",
  "Guadalajara",
  "Guipúzcoa",
  "Huelva",
  "Huesca",
  "Illes Balears",
  "Jaén",
  "La Rioja",
  "León",
  "Lleida",
  "Lugo",
  "Madrid",
  "Málaga",
  "Melilla",
  "Murcia",
  "Navarra",
  "Ourense",
  "Palencia",
  "Pontevedra",
  "Salamanca",
  "Segovia",
  "Sevilla",
  "Soria",
  "Tarragona",
  "Teruel",
  "Toledo",
  "Valencia",
  "Valladolid",
  "Vizcaya",
  "Zamora",
  "Zaragoza",
] as const;

export type SpainProvince = (typeof SPAIN_PROVINCES)[number];

export function formatTeamCategory(category: string): string {
  if (category in TEAM_CATEGORY_LABELS) {
    return TEAM_CATEGORY_LABELS[category as TeamCategory];
  }
  return category;
}

export function formatPlayerName(player: { first_name: string; last_name: string; full_name: string }): string {
  const composed = `${player.first_name} ${player.last_name}`.trim();
  return composed || player.full_name;
}
