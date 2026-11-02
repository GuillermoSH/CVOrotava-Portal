/**
 * Bloque «Cómo pagar» de los correos de aviso. Una línea por elemento del array.
 * Vacío = el correo sale sin ese bloque (la página de avisos lo señala).
 */
export const PAYMENT_INSTRUCTION_LINES: readonly string[] = [
  "Transferencia: IBAN ES97 2100 6730 4122 0048 8666 (titular: Club Voleibol Villa Orotava).",
  "Concepto: mes y nombre completo del/a jugador/a.",
  "Envía foto o captura del comprobante por WhatsApp al 616 29 88 70. Si no se envía, el pago se entenderá como no realizado.",
  "Efectivo: en la instalación, hasta el día 10 de cada mes, los martes de 16:30 a 20:00.",
];

export const PAYMENT_INSTRUCTIONS = PAYMENT_INSTRUCTION_LINES.join("\n");
