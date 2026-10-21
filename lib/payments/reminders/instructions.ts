/**
 * Bloque «Cómo pagar» de los correos de aviso. Una línea por elemento del array.
 * Vacío = el correo sale sin ese bloque (la página de avisos lo señala).
 */
export const PAYMENT_INSTRUCTION_LINES: readonly string[] = [
  // "Transferencia a ES00 0000 0000 0000 0000 0000 (titular: CV Orotava)",
  // "Indica en el concepto el nombre del jugador/a.",
  // "Efectivo: en el club, entregándolo a un responsable.",
];

export const PAYMENT_INSTRUCTIONS = PAYMENT_INSTRUCTION_LINES.join("\n");
