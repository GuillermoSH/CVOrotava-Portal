/** Majority of age in Spain. */
export const LEGAL_AGE_YEARS = 18;

export function isLegalAdult(
  birthDate: string | null | undefined,
  referenceDate: Date = new Date(),
): boolean {
  if (!birthDate) return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return false;

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;
  const refDay = referenceDate.getDate();

  let age = refYear - year;
  if (refMonth < month || (refMonth === month && refDay < day)) age -= 1;
  return age >= LEGAL_AGE_YEARS;
}

export function contactsForPlayerAge<
  T extends { full_name: string; relationship: string; phone?: string; email?: string; is_primary?: boolean },
>(input: {
  birthDate: string | null | undefined;
  firstName: string;
  lastName: string;
  contacts: T[];
}): T[] {
  const fullName = `${input.firstName} ${input.lastName}`.trim();
  if (isLegalAdult(input.birthDate)) {
    const source =
      input.contacts.find((contact) => contact.relationship === "jugador") ?? input.contacts[0];
    if (!source) return [];
    return [
      {
        ...source,
        full_name: fullName,
        relationship: "jugador" as T["relationship"],
        phone: source.phone?.trim() || undefined,
        email: source.email?.trim() || undefined,
        is_primary: true,
      },
    ];
  }

  return input.contacts.filter((contact) => contact.relationship !== "jugador");
}
