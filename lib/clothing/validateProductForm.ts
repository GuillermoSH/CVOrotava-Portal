import type { z } from "zod";

import { createProductSchema } from "@/lib/clothing/schemas";

export type ProductFormField = "model" | "brand" | "category" | "color" | "season" | "notes";

export type ProductFormFieldErrors = Partial<Record<ProductFormField, string>>;

const FIELD_MESSAGES: Record<ProductFormField, string> = {
  model: "Indica el modelo",
  brand: "Selecciona la marca",
  category: "Selecciona la categoría",
  color: "Selecciona el color",
  season: "Selecciona la temporada",
  notes: "Revisa las notas",
};

export type ValidProductFormInput = z.infer<typeof createProductSchema>;

export function validateProductFormInput(
  input: unknown,
):
  | { ok: true; data: ValidProductFormInput }
  | { ok: false; fieldErrors: ProductFormFieldErrors } {
  const parsed = createProductSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }

  const fieldErrors: ProductFormFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string" || field in fieldErrors) continue;
    if (field in FIELD_MESSAGES) {
      fieldErrors[field as ProductFormField] = FIELD_MESSAGES[field as ProductFormField];
    }
  }

  return { ok: false, fieldErrors };
}

export function toFieldError(message?: string) {
  return message ? ({ type: "manual" as const, message }) : undefined;
}
