export const TEAM_CATEGORIES = [
  "minivoley",
  "benjamin",
  "alevin",
  "infantil",
  "cadete",
  "juvenil",
  "junior",
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
  senior: "Sénior",
};

export const TEAM_GENDERS = ["female", "male"] as const;
export type TeamGender = (typeof TEAM_GENDERS)[number];

export const TEAM_GENDER_LABELS: Record<TeamGender, string> = {
  female: "Femenino",
  male: "Masculino",
};

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
