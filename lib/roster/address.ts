import {
  CANARY_PROVINCES,
  SPAIN_PROVINCES,
  STREET_TYPE_LABELS,
  STREET_TYPES,
  type StreetType,
} from "@/lib/roster/constants";

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[./]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const STREET_TYPE_ALIASES: Record<string, StreetType> = {
  calle: "calle",
  c: "calle",
  avenida: "avenida",
  avda: "avenida",
  av: "avenida",
  carretera: "carretera",
  crta: "carretera",
  ctra: "carretera",
  plaza: "plaza",
  pl: "plaza",
  paseo: "paseo",
  camino: "camino",
  urbanizacion: "urbanizacion",
  urb: "urbanizacion",
  otro: "otro",
};

const PROVINCE_ALIASES: Record<string, string> = {
  tenerife: "Santa Cruz de Tenerife",
  "santa cruz de tenerife": "Santa Cruz de Tenerife",
  "santa cruz": "Santa Cruz de Tenerife",
  "s c de tenerife": "Santa Cruz de Tenerife",
  "sc tenerife": "Santa Cruz de Tenerife",
  "las palmas": "Las Palmas",
  "las palmas de gran canaria": "Las Palmas",
  "gran canaria": "Las Palmas",
};

export type PlayerAddressInput = {
  street_type?: string | null;
  street?: string | null;
  number?: string | null;
  door?: string | null;
  postal_code?: string | null;
  municipality?: string | null;
  province?: string | null;
  fallback?: string | null;
};

export function normalizeStreetType(raw: string | null | undefined): StreetType | undefined {
  const value = fold(raw ?? "");
  if (!value) return undefined;
  const aliased = STREET_TYPE_ALIASES[value];
  if (aliased) return aliased;
  const fromLabel = STREET_TYPES.find((type) => fold(STREET_TYPE_LABELS[type]) === value);
  return fromLabel;
}

export function normalizeProvince(raw: string | null | undefined): string | undefined {
  const value = fold(raw ?? "");
  if (!value) return undefined;
  const aliased = PROVINCE_ALIASES[value];
  if (aliased) return aliased;
  const exact = SPAIN_PROVINCES.find((province) => fold(province) === value);
  return exact ?? (raw?.trim() || undefined);
}

export function hasStructuredAddress(parts: PlayerAddressInput): boolean {
  return Boolean(
    parts.street_type?.trim() ||
      parts.street?.trim() ||
      parts.number?.trim() ||
      parts.door?.trim() ||
      parts.postal_code?.trim() ||
      parts.municipality?.trim() ||
      parts.province?.trim(),
  );
}

export function formatPlayerAddress(parts: PlayerAddressInput): string | null {
  const type = normalizeStreetType(parts.street_type);
  const typeLabel = type ? STREET_TYPE_LABELS[type] : parts.street_type?.trim() || "";
  const street = parts.street?.trim() ?? "";
  const number = parts.number?.trim() ?? "";
  const door = parts.door?.trim() ?? "";
  const postal = parts.postal_code?.trim() ?? "";
  const municipality = parts.municipality?.trim() ?? "";
  const province = parts.province?.trim() ?? "";

  const via = [typeLabel, street, number].filter(Boolean).join(" ");
  const line1 = [via, door ? `pta. ${door}` : ""].filter(Boolean).join(", ");
  const place = [postal, municipality].filter(Boolean).join(" ");
  const line2 = province ? (place ? `${place} (${province})` : province) : place;
  const composed = [line1, line2].filter(Boolean).join(". ");
  if (composed) return composed;

  const fallback = parts.fallback?.trim() ?? "";
  return fallback || null;
}

export function streetTypeSelectOptions() {
  return STREET_TYPES.map((type) => ({ value: type, label: STREET_TYPE_LABELS[type] }));
}

export function provinceSelectOptions(current?: string | null) {
  const canary = new Set<string>(CANARY_PROVINCES);
  const extra =
    current?.trim() && !SPAIN_PROVINCES.some((province) => province === current)
      ? [{ value: current, label: current }]
      : [];
  return [
    ...extra,
    {
      label: "Canarias",
      options: CANARY_PROVINCES.map((province) => ({ value: province, label: province })),
    },
    {
      label: "Resto de España",
      options: SPAIN_PROVINCES.filter((province) => !canary.has(province)).map((province) => ({
        value: province,
        label: province,
      })),
    },
  ];
}
