import { normalizeProvince, normalizeStreetType } from "@/lib/roster/address";
import { STREET_TYPE_LABELS, type StreetType } from "@/lib/roster/constants";
import { isValidSpanishPostalCode } from "@/lib/roster/validators";

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const JUNK_ADDRESS = new Set([
  "espanola",
  "espanol",
  "espana",
  "spain",
  "spanish",
  "nacionalidad",
  "si",
  "no",
  "true",
  "false",
  "1",
  "0",
]);

const STREET_PREFIX_RE =
  /^(?:(c\/|c\.)|(calle|avda\.?|av\.?|avenida|crta\.?|ctra\.?|carretera|pz\.?|pl\.?|plaza|pso\.?|paseo|cam\.?|camino|urb\.?|urbanizacion)\b)[.\s/]*/i;

const NUMBER_RE =
  /(?:^|[\s,])(?:n[ºo°.]?\s*|n\.?\s*|nº\s*|num(?:ero|éro)?\.?\s*|n[uú]mero\s*)(\d+[A-Za-z]?)\b/i;

const TRAILING_NUMBER_RE = /\s+(\d+[A-Za-z]?)\s*$/;

const DOOR_HINT_RE =
  /\b(?:portal|pta\.?|puerta|piso|planta|esc\.?|escalera|edf\.?|edificio|bloque|blq\.?|vda\.?|vivienda|apto\.?|apartamento)\b/i;

const ISLAND_TO_PROVINCE: Record<string, string> = {
  tenerife: "Santa Cruz de Tenerife",
  "la palma": "Santa Cruz de Tenerife",
  "la gomera": "Santa Cruz de Tenerife",
  "el hierro": "Santa Cruz de Tenerife",
  "gran canaria": "Las Palmas",
  lanzarote: "Las Palmas",
  fuerteventura: "Las Palmas",
};

export type FederationAddressInput = {
  domicilio?: string | null;
  direccion?: string | null;
  postalCode?: string | null;
  localidad?: string | null;
  isla?: string | null;
  provincia?: string | null;
};

export type FederationAddressParseResult = {
  street_type?: StreetType;
  street?: string;
  number?: string;
  door?: string;
  postal_code?: string;
  municipality?: string;
  province?: string;
  /** Texto libre solo si parece domicilio y no se pudo estructurar con confianza. */
  address?: string;
  structured: boolean;
  missingFields: string[];
};

function looksLikeAddress(raw: string): boolean {
  const value = raw.trim();
  if (value.length < 4) return false;
  const folded = fold(value);
  if (JUNK_ADDRESS.has(folded)) return false;
  if (!/[a-záéíóúñ]/i.test(value)) return false;
  if (STREET_PREFIX_RE.test(value)) return true;
  if (NUMBER_RE.test(value) || /\d/.test(value)) return true;
  return /[a-záéíóúñ]{3,}/i.test(value) && value.includes(" ");
}

function pickRawStreetLine(input: FederationAddressInput): string {
  const domicilio = input.domicilio?.trim() ?? "";
  if (domicilio && looksLikeAddress(domicilio)) return domicilio;

  const direccion = input.direccion?.trim() ?? "";
  if (!domicilio && direccion && looksLikeAddress(direccion)) return direccion;
  return "";
}

function provinceFromIsland(isla: string | null | undefined): string | undefined {
  const folded = fold(isla ?? "");
  if (!folded) return undefined;
  return ISLAND_TO_PROVINCE[folded];
}

function parseStreetLine(raw: string): {
  street_type?: StreetType;
  street?: string;
  number?: string;
  door?: string;
  confident: boolean;
} {
  let rest = raw.trim().replace(/\s+/g, " ");
  if (!rest) return { confident: false };

  let streetType: StreetType | undefined;
  const prefix = STREET_PREFIX_RE.exec(rest);
  if (prefix) {
    const token = (prefix[1] || prefix[2] || "").trim();
    streetType = normalizeStreetType(token.replace(/[./]/g, ""));
    rest = rest.slice(prefix[0].length).trim();
  }

  let number: string | undefined;
  let door: string | undefined;

  const numbered = NUMBER_RE.exec(rest);
  if (numbered && numbered.index != null) {
    number = numbered[1];
    const before = rest.slice(0, numbered.index).replace(/[,\s]+$/g, "").trim();
    const after = rest.slice(numbered.index + numbered[0].length).replace(/^[,\s]+/g, "").trim();
    rest = before;
    if (after) {
      if (DOOR_HINT_RE.test(after) || after.length <= 40) {
        door = after.replace(/^,\s*/, "").trim() || undefined;
      } else {
        // Texto sobrante dudoso → no estructurar
        return { confident: false };
      }
    }
  } else {
    const trailing = TRAILING_NUMBER_RE.exec(rest);
    if (trailing) {
      number = trailing[1];
      rest = rest.slice(0, trailing.index).trim();
    }
  }

  const street = rest.replace(/[,\s]+$/g, "").trim();
  if (!street || street.length < 2) return { confident: false };
  if (!streetType) {
    // Sin tipo de vía claro no forzamos "calle"
    return { confident: false };
  }
  if (!number) return { confident: false };

  return {
    street_type: streetType,
    street,
    number,
    door,
    confident: true,
  };
}

/**
 * Best-effort domicilio federativo. Ante duda: no estructurar y anotar missingFields.
 */
export function parseFederationAddress(input: FederationAddressInput): FederationAddressParseResult {
  const missingFields: string[] = [];
  const rawLine = pickRawStreetLine(input);
  const postalRaw = (input.postalCode ?? "").replace(/\D/g, "").slice(0, 5);
  const postal_code = isValidSpanishPostalCode(postalRaw) ? postalRaw : undefined;
  if ((input.postalCode ?? "").trim() && !postal_code) {
    missingFields.push("Código postal");
  } else if (!postal_code) {
    missingFields.push("Código postal");
  }

  const localidadRaw = (input.localidad ?? "").trim();
  const municipality =
    localidadRaw && !localidadRaw.includes("?") ? localidadRaw : undefined;
  if (!municipality) {
    missingFields.push("Municipio");
  }

  const province = normalizeProvince(input.provincia) ?? provinceFromIsland(input.isla);
  if (!province) {
    missingFields.push("Provincia");
  }

  if (!rawLine) {
    missingFields.push("Tipo de vía", "Vía", "Número");
    return {
      postal_code,
      municipality,
      province,
      structured: false,
      missingFields: [...new Set(missingFields)],
    };
  }

  const parsed = parseStreetLine(rawLine);
  if (!parsed.confident || !parsed.street_type || !parsed.street || !parsed.number) {
    missingFields.push("Tipo de vía", "Vía", "Número");
    return {
      postal_code,
      municipality,
      province,
      address: rawLine,
      structured: false,
      missingFields: [...new Set(missingFields)],
    };
  }

  const structured =
    Boolean(parsed.street_type && parsed.street && parsed.number && postal_code && municipality && province);

  if (!structured) {
    // Partes de vía ok pero faltan CP/municipio/provincia → incompleto, no marcar structured
    return {
      street_type: parsed.street_type,
      street: parsed.street,
      number: parsed.number,
      door: parsed.door,
      postal_code,
      municipality,
      province,
      address: undefined,
      structured: false,
      missingFields: [...new Set(missingFields)],
    };
  }

  return {
    street_type: parsed.street_type,
    street: parsed.street,
    number: parsed.number,
    door: parsed.door,
    postal_code,
    municipality,
    province,
    structured: true,
    missingFields: [],
  };
}

export function federationStreetTypeLabel(type: StreetType | undefined): string {
  return type ? STREET_TYPE_LABELS[type] : "";
}
