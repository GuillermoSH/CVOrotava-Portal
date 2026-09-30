/** Conceptos fijos ofrecidos en el formulario (concept sigue siendo texto libre en DB). */
export const PAYMENT_CONCEPTS = ["Matrícula", "Cuota mensual", "Otro"] as const;
export type PaymentConceptOption = (typeof PAYMENT_CONCEPTS)[number];

export const PAYMENT_METHODS = ["transferencia", "efectivo"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
};

/** Concepto que identifica la matrícula de temporada para el cálculo de pendientes. */
export const MATRICULA_CONCEPT = "Matrícula";
