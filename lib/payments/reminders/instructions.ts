/**
 * Bloque «Cómo pagar» de los correos de aviso, en secciones (una por forma de pago).
 * Sin secciones = el correo sale sin ese bloque (la página de avisos lo señala).
 */
export type PaymentInstructionSection = { title: string; lines: readonly string[] };

export const PAYMENT_INSTRUCTION_SECTIONS: readonly PaymentInstructionSection[] = [
  {
    title: "Transferencia",
    lines: [
      "IBAN: ES97 2100 6730 4122 0048 8666",
      "Titular: Club Voleibol Villa Orotava",
      "Concepto: mes y nombre completo del/a jugador/a",
      "! Envía foto o captura del comprobante por WhatsApp al 616 29 88 70. Si no se envía, el pago se entenderá como no realizado.",
    ],
  },
  {
    title: "Efectivo",
    lines: ["En la instalación, hasta el día 10 de cada mes, los martes de 16:30 a 20:00."],
  },
];

/** Texto plano: `# Título` abre una sección y cada línea siguiente es un punto. */
export const PAYMENT_INSTRUCTIONS = PAYMENT_INSTRUCTION_SECTIONS.map(
  (s) => `# ${s.title}\n${s.lines.join("\n")}`,
).join("\n");
