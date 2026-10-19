/** Minúsculas y sin tildes/diacríticos: «María» → «maria». Para comparar texto de búsqueda. */
export function normalizeSearchText(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** `haystack` contiene `query` ignorando tildes y mayúsculas. Query vacía → true. */
export function searchIncludes(haystack: string, query: string): boolean {
  const q = normalizeSearchText(query).trim();
  if (!q) return true;
  return normalizeSearchText(haystack).includes(q);
}
