import { hasStructuredAddress } from "@/lib/roster/address";
import { isLegalAdult } from "@/lib/roster/age";
import { isNieDocument, isValidDniOrNie } from "@/lib/roster/document";
import { isValidEmail, isValidPhone } from "@/lib/roster/validators";

export type PlayerProfileCompletenessContact = {
  full_name?: string | null;
  relationship?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type PlayerProfileCompletenessInput = {
  first_name?: string | null;
  last_name?: string | null;
  birth_date?: string | null;
  dni?: string | null;
  birth_country?: string | null;
  address?: string | null;
  address_street_type?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_door?: string | null;
  address_postal_code?: string | null;
  address_municipality?: string | null;
  address_province?: string | null;
  contacts?: PlayerProfileCompletenessContact[] | null;
  /** Lista admin: solo teléfono primario (no implica email). */
  primary_phone?: string | null;
};

export type PlayerProfileCompleteness = {
  isComplete: boolean;
  missingFields: string[];
  summary: string;
};

/**
 * Completitud de ficha derivada de datos (sin columna nueva en BD).
 * Alineada a lo que exige el formulario web estricto.
 * En listado (sin `contacts`) solo se exige teléfono primario + domicilio + NIE.
 */
export function getPlayerProfileCompleteness(
  player: PlayerProfileCompletenessInput,
): PlayerProfileCompleteness {
  const missingFields: string[] = [];

  if (!player.first_name?.trim()) missingFields.push("Nombre");
  if (!player.last_name?.trim()) missingFields.push("Apellidos");
  if (!player.birth_date?.trim()) missingFields.push("Fecha de nacimiento");

  const dni = player.dni?.trim() ?? "";
  if (!dni) {
    missingFields.push("DNI/NIE");
  } else if (!isValidDniOrNie(dni)) {
    missingFields.push("DNI/NIE");
  } else if (isNieDocument(dni) && !player.birth_country?.trim()) {
    missingFields.push("País de nacimiento");
  }

  const structuredOk =
    Boolean(player.address_street_type?.trim()) &&
    Boolean(player.address_street?.trim()) &&
    Boolean(player.address_number?.trim()) &&
    Boolean(player.address_postal_code?.trim()) &&
    Boolean(player.address_municipality?.trim()) &&
    Boolean(player.address_province?.trim());

  if (!structuredOk) {
    if (!player.address_street_type?.trim()) missingFields.push("Tipo de vía");
    if (!player.address_street?.trim()) missingFields.push("Vía");
    if (!player.address_number?.trim()) missingFields.push("Número");
    if (!player.address_postal_code?.trim()) missingFields.push("Código postal");
    if (!player.address_municipality?.trim()) missingFields.push("Municipio");
    if (!player.address_province?.trim()) missingFields.push("Provincia");
  } else if (
    !hasStructuredAddress({
      street_type: player.address_street_type,
      street: player.address_street,
      number: player.address_number,
      postal_code: player.address_postal_code,
      municipality: player.address_municipality,
      province: player.address_province,
    })
  ) {
    missingFields.push("Domicilio");
  }

  const adult = isLegalAdult(player.birth_date);
  const contacts = player.contacts ?? [];
  const hasContactDetails = contacts.length > 0;

  if (hasContactDetails) {
    if (adult) {
      const self =
        contacts.find((contact) => contact.relationship === "jugador") ?? contacts[0];
      if (!self?.phone?.trim() || !isValidPhone(self.phone)) missingFields.push("Teléfono");
      if (!self?.email?.trim() || !isValidEmail(self.email)) missingFields.push("Email");
    } else {
      const guardian =
        contacts.find((contact) => contact.relationship !== "jugador") ?? contacts[0];
      if (!guardian?.full_name?.trim()) missingFields.push("Contacto (tutor)");
      if (!guardian?.phone?.trim() || !isValidPhone(guardian.phone)) {
        missingFields.push("Teléfono del contacto");
      }
      if (!guardian?.email?.trim() || !isValidEmail(guardian.email)) {
        missingFields.push("Email del contacto");
      }
    }
  } else if ("primary_phone" in player) {
    // Listado: solo sabemos el teléfono primario.
    if (!player.primary_phone?.trim() || !isValidPhone(player.primary_phone)) {
      missingFields.push(adult ? "Teléfono" : "Teléfono del contacto");
    }
  } else {
    missingFields.push(adult ? "Teléfono" : "Contacto (tutor)");
    if (adult) missingFields.push("Email");
    else {
      missingFields.push("Teléfono del contacto");
      missingFields.push("Email del contacto");
    }
  }

  const unique = [...new Set(missingFields)];
  const isComplete = unique.length === 0;

  return {
    isComplete,
    missingFields: unique,
    summary: isComplete
      ? "Ficha completa"
      : unique.length === 1
        ? `Falta ${unique[0]}`
        : `Ficha incompleta (${unique.length})`,
  };
}

export function isPlayerProfileIncomplete(player: PlayerProfileCompletenessInput): boolean {
  return !getPlayerProfileCompleteness(player).isComplete;
}
