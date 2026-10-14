/** Partículas que forman parte del apellido: "de la Cruz", "del Castillo", "van Dijk". */
const SURNAME_PARTICLES = new Set([
  "de",
  "del",
  "la",
  "las",
  "los",
  "el",
  "y",
  "da",
  "das",
  "do",
  "dos",
  "di",
  "van",
  "von",
  "san",
  "santa",
]);

function words(value: string | null | undefined): string[] {
  return (value ?? "").trim().split(/\s+/).filter(Boolean);
}

/** Primer apellido completo: salta partículas hasta la primera palabra "de verdad". */
function firstSurname(lastName: string | null | undefined): string {
  const parts = words(lastName);
  const taken: string[] = [];
  for (const part of parts) {
    taken.push(part);
    if (!SURNAME_PARTICLES.has(part.toLowerCase())) break;
  }
  return taken.join(" ");
}

/**
 * Nombre corto para pantallas estrechas: primer nombre + primer apellido
 * ("Valeria Isabella Marín Lucas" → "Valeria Marín"). Sin nombre/apellidos separados,
 * recurre a las dos primeras palabras del nombre completo.
 */
export function shortPlayerName(player: {
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
}): string {
  const first = words(player.first_name)[0];
  const surname = firstSurname(player.last_name);
  if (first && surname) return `${first} ${surname}`;
  if (first) return first;
  return words(player.full_name).slice(0, 2).join(" ") || player.full_name;
}
