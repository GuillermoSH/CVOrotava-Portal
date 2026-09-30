import { z } from "zod";

import { PAYMENT_METHODS } from "@/lib/payments/constants";

export const registerPaymentSchema = z.object({
  player_id: z.string().uuid("Jugador no válido"),
  concept: z.string().trim().min(1, "Indica el concepto").max(120),
  amount: z.coerce.number().positive("El importe debe ser mayor que 0"),
  paid_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida"),
  method: z.enum(PAYMENT_METHODS),
  notes: z.string().trim().max(500).optional(),
});

export type RegisterPaymentInput = z.infer<typeof registerPaymentSchema>;

export const createPaymentConceptSchema = z.object({
  concept: z.string().trim().min(1, "Indica el concepto").max(120),
  amount: z.coerce.number().positive("El importe debe ser mayor que 0"),
  is_matricula: z.boolean().optional().default(false),
});

export const updatePaymentConceptSchema = createPaymentConceptSchema.and(
  z.object({
    id: z.string().uuid(),
    is_active: z.boolean(),
  }),
);

export type CreatePaymentConceptFormInput = z.infer<typeof createPaymentConceptSchema>;
export type UpdatePaymentConceptFormInput = z.infer<typeof updatePaymentConceptSchema>;
