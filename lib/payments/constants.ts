export const PAYMENT_METHODS = ["transferencia", "efectivo"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
};

/**
 * Valor centinela para la opción "Otro" (concepto/importe libres) en el
 * desplegable de /admin/pagos — los conceptos reales vienen de payment_concepts
 * (ver lib/payments/repository/concepts.ts), gestionables desde /admin/pagos/conceptos.
 */
export const OTHER_CONCEPT_VALUE = "__other__";
