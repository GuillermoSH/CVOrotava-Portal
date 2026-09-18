const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPAIN_POSTAL_RE = /^(0[1-9]|[1-4]\d|5[0-2])\d{3}$/;

export function isValidEmail(value: string | null | undefined): boolean {
  const email = value?.trim() ?? "";
  return EMAIL_RE.test(email);
}

/** Teléfono español (9 dígitos, opcional +34) o internacional con +. */
export function isValidPhone(value: string | null | undefined): boolean {
  const raw = value?.trim() ?? "";
  if (!raw) return false;
  const compact = raw.replace(/[\s().-]/g, "");
  if (/^\+34\d{9}$/.test(compact) || /^0034\d{9}$/.test(compact)) {
    return /^[6-9]/.test(compact.slice(-9));
  }
  if (/^\+\d{8,15}$/.test(compact)) return true;
  return /^[6-9]\d{8}$/.test(compact);
}

export function isValidSpanishPostalCode(value: string | null | undefined): boolean {
  return SPAIN_POSTAL_RE.test(value?.trim() ?? "");
}

export function isRealIsoDate(value: string | null | undefined): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value?.trim() ?? "");
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function birthDateValidationMessage(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "Indica la fecha de nacimiento";
  if (!isRealIsoDate(trimmed)) return "Fecha no válida";
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (trimmed > todayIso) return "La fecha no puede ser futura";
  if (Number(trimmed.slice(0, 4)) < 1920) return "Fecha no válida";
  return null;
}

const PLAYER_ERROR_ORDER = [
  "first_name",
  "last_name",
  "birth_date",
  "dni",
  "birth_country",
  "nationality",
  "address_street_type",
  "address_street",
  "address_number",
  "address_postal_code",
  "address_municipality",
  "address_province",
  "player-phone",
  "player-email",
  "contact-name-0",
  "contact-relationship-0",
  "contact-phone-0",
  "contact-email-0",
  "contact-name-1",
  "contact-relationship-1",
  "contact-phone-1",
  "contact-email-1",
] as const;

export function mapPlayerSchemaIssuePath(path: PropertyKey[], isAdult: boolean): string | null {
  const [head, index, field] = path;
  if (head === "contacts") {
    if (isAdult) {
      if (field === "email") return "player-email";
      return "player-phone";
    }
    const i = typeof index === "number" ? index : Number(index);
    const slot = Number.isFinite(i) ? i : 0;
    if (field === "full_name") return `contact-name-${slot}`;
    if (field === "relationship") return `contact-relationship-${slot}`;
    if (field === "phone") return `contact-phone-${slot}`;
    if (field === "email") return `contact-email-${slot}`;
    return `contact-name-${slot}`;
  }
  if (typeof head === "string") return head;
  return null;
}

export function mapPlayerSchemaIssues(
  issues: { path: PropertyKey[]; message: string }[],
  isAdult: boolean,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = mapPlayerSchemaIssuePath(issue.path, isAdult);
    if (!key || errors[key]) continue;
    errors[key] = issue.message;
  }
  return errors;
}

export function firstPlayerErrorField(errors: Record<string, string>): string | undefined {
  return PLAYER_ERROR_ORDER.find((name) => errors[name]) ?? Object.keys(errors)[0];
}

export function focusPlayerField(name: string) {
  const node = document.getElementById(name);
  if (!(node instanceof HTMLElement)) return;
  node.scrollIntoView({ behavior: "smooth", block: "center" });
  node.focus();
}