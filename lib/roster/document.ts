function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Quita espacios, puntos y guiones: `X-1234567-L` → `X1234567L`. */
export function normalizeDocumentId(value: string): string {
  return value.toUpperCase().replace(/[\s.-]/g, "");
}

const NIE_RE = /^[XYZ]\d{7}[A-Z]$/;
const DNI_RE = /^\d{8}[A-Z]$/;

export function isNieDocument(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return NIE_RE.test(normalizeDocumentId(value));
}

export function isDniDocument(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return DNI_RE.test(normalizeDocumentId(value));
}

export function isSpanishNationality(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  const folded = fold(value);
  return folded === "espanola" || folded === "espanol" || folded === "espana" || folded === "spain" || folded === "spanish";
}

const DNI_CONTROL = "TRWAGMYFPDXBNJZSQVHLCKE";

function controlLetter(num: number): string {
  return DNI_CONTROL[num % 23] ?? "";
}

export function isValidDniOrNie(value: string | null | undefined): boolean {
  const id = normalizeDocumentId(value ?? "");
  if (DNI_RE.test(id)) {
    return controlLetter(Number(id.slice(0, 8))) === id[8];
  }
  if (NIE_RE.test(id)) {
    const prefix = id[0] === "X" ? "0" : id[0] === "Y" ? "1" : "2";
    return controlLetter(Number(`${prefix}${id.slice(1, 8)}`)) === id[8];
  }
  return false;
}

export function documentValidationMessage(value: string | null | undefined): string {
  const id = normalizeDocumentId(value ?? "");
  if (!id) return "Indica el DNI o NIE";
  if (DNI_RE.test(id) && !isValidDniOrNie(id)) return "La letra del DNI no coincide";
  if (NIE_RE.test(id) && !isValidDniOrNie(id)) return "La letra del NIE no coincide";
  return "Introduce un DNI (12345678A) o un NIE (X1234567A)";
}
