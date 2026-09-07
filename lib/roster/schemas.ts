import { z } from "zod";

import { CLOTHING_SIZES } from "@/lib/clothing/constants";
import { CONTACT_RELATIONSHIPS, TEAM_CATEGORIES, TEAM_GENDERS } from "@/lib/roster/constants";

const blankToUndefined = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : undefined;
};

export const playerContactInputSchema = z.object({
  full_name: z.string().trim().min(1, "Indica el nombre del contacto").max(120),
  relationship: z.enum(CONTACT_RELATIONSHIPS),
  phone: z.string().max(30).optional().transform(blankToUndefined),
  email: z
    .string()
    .max(120)
    .optional()
    .transform(blankToUndefined)
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Email no válido"),
  is_primary: z.boolean().optional().default(false),
});

export const upsertPlayerSchema = z.object({
  first_name: z.string().trim().min(1, "Indica el nombre").max(80),
  last_name: z.string().trim().min(1, "Indica los apellidos").max(120),
  birth_date: z
    .string()
    .optional()
    .nullable()
    .transform((value) => (value && value.trim() ? value.trim() : null))
    .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), "Fecha no válida"),
  dni: z.string().max(20).optional().transform(blankToUndefined),
  team_id: z.string().uuid("Selecciona un equipo"),
  season: z.string().min(4).max(20),
  license_completed: z.boolean().optional().default(false),
  registration_papers_received: z.boolean().optional().default(false),
  medical_notes: z.string().max(2000).optional().transform(blankToUndefined),
  clothing_size: z.enum(CLOTHING_SIZES).nullable().optional(),
  address: z.string().max(300).optional().transform(blankToUndefined),
  is_active: z.boolean().optional().default(true),
  contacts: z
    .array(playerContactInputSchema)
    .max(2)
    .default([])
    .transform((contacts) => contacts.filter((contact) => contact.full_name.trim().length > 0)),
});

export const createPlayerSchema = upsertPlayerSchema;

export const updatePlayerSchema = upsertPlayerSchema.extend({
  id: z.string().uuid(),
});

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
