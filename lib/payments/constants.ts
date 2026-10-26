export const PAYMENT_METHODS = ["transferencia", "efectivo"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
};

/**
 * Valor centinela para la opción "Otro" (concepto/importe libres) en el
 * desplegable de /admin/pagos — el resto de opciones salen de la tarifa de la
 * temporada (ver lib/payments/fees.ts, gestionable desde /admin/pagos/tarifas).
 */
export const OTHER_CONCEPT_VALUE = "__other__";

/** Mensaje al intentar cobrar a un jugador exento (se desbloquea en su ficha). */
export const EXEMPT_PLAYER_ERROR =
  "Este jugador está exento de pagos esta temporada. Quita la exención en su ficha para registrar un cobro.";
