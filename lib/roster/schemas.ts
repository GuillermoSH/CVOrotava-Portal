import { z } from "zod";

import { CLOTHING_SIZES } from "@/lib/clothing/constants";
import { CONTACT_RELATIONSHIPS, STREET_TYPES, TEAM_CATEGORIES, TEAM_GENDERS } from "@/lib/roster/constants";
import {
  documentValidationMessage,
  isNieDocument,
  isSpanishNationality,
  isValidDniOrNie,
  normalizeDocumentId,
} from "@/lib/roster/document";
import {
  birthDateValidationMessage,
  isValidEmail,
  isValidPhone,
  isValidSpanishPostalCode,
} from "@/lib/roster/validators";

const blankToUndefined = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : undefined;
};

export const playerContactInputSchema = z.object({
  full_name: z.string().trim().min(1, "Indica el nombre del contacto").max(120),
  relationship: z.enum(CONTACT_RELATIONSHIPS),
  phone: z
    .string()
    .trim()
    .min(1, "Indica el teléfono")
    .refine(isValidPhone, "Teléfono no válido. Usa 9 dígitos o prefijo +34"),
  email: z.string().trim().min(1, "Indica el email").refine(isValidEmail, "Email no válido"),
  is_primary: z.boolean().optional().default(false),
});

export const upsertPlayerSchema = z
  .object({
    first_name: z.string().trim().min(1, "Indica el nombre").max(80),
    last_name: z.string().trim().min(1, "Indica los apellidos").max(120),
    birth_date: z.string().trim().superRefine((value, ctx) => {
      const message = birthDateValidationMessage(value);
      if (message) ctx.addIssue({ code: "custom", message });
    }),
    dni: z
      .string()
      .trim()
      .min(1, "Indica el DNI o NIE")
      .transform(normalizeDocumentId)
      .superRefine((value, ctx) => {
        if (!isValidDniOrNie(value)) {
          ctx.addIssue({ code: "custom", message: documentValidationMessage(value) });
        }
      }),
    team_id: z
      .union([z.string().uuid(), z.literal(""), z.null()])
      .optional()
      .transform((value) => (value ? value : null)),
    season: z.string().min(4).max(20),
    license_completed: z.boolean().optional().default(false),
    registration_papers_received: z.boolean().optional().default(false),
    docs_delivered_to_family: z.boolean().optional().default(false),
    docs_delivered_at: z
      .string()
      .optional()
      .nullable()
      .transform((value) => (value && value.trim() ? value.trim() : null))
      .refine(
        (value) =>
          value === null ||
          /^\d{4}-\d{2}-\d{2}$/.test(value) ||
          !Number.isNaN(Date.parse(value)),
        "Fecha de docs no válida",
      ),
    photo_taken: z.boolean().optional().default(false),
    photo_consent: z.boolean().optional().default(false),
    in_whatsapp_group: z.boolean().optional().default(false),
    medical_notes: z.string().max(2000).optional().transform(blankToUndefined),
    clothing_size: z.enum(CLOTHING_SIZES).nullable().optional(),
    address: z.string().max(300).optional().transform(blankToUndefined),
    address_street_type: z
      .string()
      .trim()
      .min(1, "Indica el tipo de vía")
      .refine(
        (value): value is (typeof STREET_TYPES)[number] =>
          (STREET_TYPES as readonly string[]).includes(value),
        "Indica el tipo de vía",
      ),
    address_street: z.string().trim().min(1, "Indica la vía").max(120),
    address_number: z.string().trim().min(1, "Indica el número").max(20),
    address_door: z.string().max(30).optional().transform(blankToUndefined),
    address_postal_code: z
      .string()
      .trim()
      .min(1, "Indica el código postal")
      .refine(isValidSpanishPostalCode, "Código postal no válido"),
    address_municipality: z.string().trim().min(1, "Indica el municipio").max(80),
    address_province: z.string().trim().min(1, "Indica la provincia").max(80),
    birth_country: z.string().max(80).optional().transform(blankToUndefined),
    nationality: z
      .string()
      .max(80)
      .optional()
      .transform(blankToUndefined)
      .transform((value) => (value && !isSpanishNationality(value) ? value : undefined)),
    is_active: z.boolean().optional().default(true),
    contacts: z.array(playerContactInputSchema).min(1, "Indica un contacto").max(2),
  })
  .superRefine((value, ctx) => {
    if (isNieDocument(value.dni) && !value.birth_country) {
      ctx.addIssue({
        code: "custom",
        message: "Indica el país de nacimiento",
        path: ["birth_country"],
      });
    }
  });

export const createPlayerSchema = upsertPlayerSchema;

export const updatePlayerSchema = upsertPlayerSchema.and(
  z.object({
    id: z.string().uuid(),
  }),
);

export const createTeamSchema = z.object({
  name: z.string().trim().min(1, "Indica el nombre del equipo").max(80),
  category: z.enum(TEAM_CATEGORIES),
  gender: z.enum(TEAM_GENDERS),
  season: z.string().min(4).max(20),
});

export const setPlayerActiveSchema = z.object({
  id: z.string().uuid(),
  is_active: z.boolean(),
});

export const PLAYER_LIST_TOGGLE_FIELD_VALUES = [
  "registration_papers_received",
  "docs_delivered_to_family",
  "photo_taken",
  "license_completed",
  "in_whatsapp_group",
] as const;

export const updatePlayerChecklistFieldSchema = z.object({
  id: z.string().uuid(),
  field: z.enum(PLAYER_LIST_TOGGLE_FIELD_VALUES),
  value: z.boolean(),
});

export const bulkUpdatePlayerChecklistSchema = z.object({
  player_ids: z.array(z.string().uuid()).min(1, "Selecciona al menos un jugador").max(2000),
  field: z.enum(PLAYER_LIST_TOGGLE_FIELD_VALUES),
  value: z.boolean(),
});
