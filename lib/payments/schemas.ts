import { z } from "zod";

import { PAYMENT_METHODS } from "@/lib/payments/constants";

const paidDateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida");

/** Línea de tarifa que cierra el cobro; ambos null = cobro libre ("Otro"). */
const feeTargetFields = {
  fee_code: z.string().trim().min(1).max(60).nullish(),
  billing_month: z.coerce.number().int().min(1).max(12).nullish(),
};

export const registerPaymentSchema = z.object({
  player_id: z.string().uuid("Jugador no válido"),
  concept: z.string().trim().min(1, "Indica el concepto").max(120),
  amount: z.coerce.number().positive("El importe debe ser mayor que 0"),
  paid_date: paidDateSchema,
  method: z.enum(PAYMENT_METHODS),
  notes: z.string().trim().max(500).optional(),
  ...feeTargetFields,
});

export type RegisterPaymentInput = z.infer<typeof registerPaymentSchema>;

/** Registro en bloque: mismo concepto/fecha/método, importe propio de cada jugador. */
export const registerBulkPaymentsSchema = z.object({
  entries: z
    .array(
      z.object({
        player_id: z.string().uuid("Jugador no válido"),
        amount: z.coerce.number().positive("El importe debe ser mayor que 0"),
      }),
    )
    .min(1, "Selecciona al menos un jugador")
    .max(500),
  concept: z.string().trim().min(1, "Indica el concepto").max(120),
  paid_date: paidDateSchema,
  method: z.enum(PAYMENT_METHODS),
  notes: z.string().trim().max(500).optional(),
  ...feeTargetFields,
});

export type RegisterBulkPaymentsInput = z.infer<typeof registerBulkPaymentsSchema>;

const seasonSchema = z.string().trim().regex(/^\d{4}-\d{2}$/, "Temporada no válida");

export const feeAudienceSchema = z.enum(["base", "senior", "aficionados"]);

const optionalAmount = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.coerce.number().positive("El importe debe ser mayor que 0").nullable(),
);

export const upsertFeeLineSchema = z
  .object({
    id: z.string().uuid().optional(),
    season: seasonSchema,
    audience: feeAudienceSchema,
    code: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .regex(/^[a-z0-9_]+$/, "Código no válido"),
    label: z.string().trim().min(1, "Indica el nombre").max(80),
    kind: z.enum(["once", "monthly"]),
    amount: optionalAmount,
    amount_extended: optionalAmount,
    months: z.array(z.number().int().min(1).max(12)).max(12),
  })
  .refine((value) => value.kind === "once" || value.months.length > 0, {
    message: "Elige al menos un mes",
    path: ["months"],
  });

export type UpsertFeeLineInput = z.infer<typeof upsertFeeLineSchema>;

export const copySeasonFeesSchema = z.object({
  from_season: seasonSchema,
  to_season: seasonSchema,
});
