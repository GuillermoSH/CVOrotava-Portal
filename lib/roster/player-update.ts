/**
 * Campos de la ficha que también se editan desde otros flujos (drawer de WhatsApp,
 * checklist del listado, asignación de equipo en bloque, baja…). Guardar la ficha
 * con una copia vieja no debe revertirlos: si el usuario no los tocó en la ficha,
 * se conserva el valor que haya en la base de datos.
 */
export const PRESERVABLE_PLAYER_FIELDS = [
  "team_id",
  "gender",
  "license_completed",
  "registration_papers_received",
  "docs_delivered_to_family",
  "docs_delivered_at",
  "photo_taken",
  "photo_consent",
  "in_whatsapp_group",
  "pays_extended_monthly",
  "is_active",
] as const;

export type PreservablePlayerField = (typeof PRESERVABLE_PLAYER_FIELDS)[number];

export type PreservablePlayerValues = Record<
  PreservablePlayerField,
  string | boolean | null
>;

/** Campos cuyo valor en la ficha sigue igual que cuando se cargó: no hay que escribirlos. */
export function unchangedPlayerFields(
  baseline: PreservablePlayerValues,
  current: PreservablePlayerValues,
): PreservablePlayerField[] {
  return PRESERVABLE_PLAYER_FIELDS.filter((field) => baseline[field] === current[field]);
}

/** Quita de un parche de UPDATE las columnas que deben conservar su valor actual. */
export function omitPreservedFields<T extends Record<string, unknown>>(
  patch: T,
  preserve: readonly string[] | undefined,
): Partial<T> {
  if (!preserve || preserve.length === 0) return patch;
  const skip = new Set(preserve);
  return Object.fromEntries(
    Object.entries(patch).filter(([key]) => !skip.has(key)),
  ) as Partial<T>;
}
