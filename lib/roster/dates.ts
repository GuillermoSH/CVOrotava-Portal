import { isRealIsoDate } from "@/lib/roster/validators";

/** ISO `YYYY-MM-DD` → `DD/MM/AAAA` for Spanish UI. */
export function isoToEsDate(iso: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso?.trim() ?? "");
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/**
 * Parse ISO or Spanish `DD/MM/AAAA` (also `D/M/YYYY`, `/` or `-`).
 * Empty → null; unparseable → "invalid".
 */
export function parseFlexibleDate(raw: string | null | undefined): string | null | "invalid" {
  const value = raw?.trim() ?? "";
  if (!value) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) {
    const date = `${iso[1]}-${iso[2]}-${iso[3]}`;
    return isRealIsoDate(date) ? date : "invalid";
  }

  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value);
  if (dmy) {
    const day = dmy[1]!.padStart(2, "0");
    const month = dmy[2]!.padStart(2, "0");
    const date = `${dmy[3]}-${month}-${day}`;
    return isRealIsoDate(date) ? date : "invalid";
  }

  return "invalid";
}
