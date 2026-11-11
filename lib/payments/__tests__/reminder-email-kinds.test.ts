import { describe, expect, it } from "vitest";

import { renderCombinedReminderEmail } from "@/lib/payments/reminders/email";
import type { ReminderItem } from "@/lib/payments/reminders/plan";

const item = (month: number, late: boolean): ReminderItem => ({
  label: "Cuota mensual",
  month,
  remaining: 25,
  late,
});

function render(kind: "aviso" | "ultimo_aviso" | "atrasado", items: ReminderItem[]) {
  const total = items.reduce((acc, i) => acc + i.remaining, 0);
  return renderCombinedReminderEmail({
    kind,
    players: [{ playerName: "Jugador de Ejemplo", items, total }],
    instructions: "",
  });
}

describe("aspecto del correo según el tipo de aviso", () => {
  it("cada tipo tiene su franja, etiqueta y titular", () => {
    const reminder = render("aviso", [item(11, false)]);
    const lastDay = render("ultimo_aviso", [item(11, false)]);
    const late = render("atrasado", [item(10, true)]);

    expect(reminder.html).toContain("Recordatorio · día 10");
    expect(reminder.html).toContain("#1E5FA8");
    expect(lastDay.html).toContain("Aviso · cierre de mes");
    expect(lastDay.html).toContain("#B45309");
    expect(late.html).toContain("Aviso · pago atrasado");
    expect(late.html).toContain("#B91C1C");
  });

  it("el aviso de cierre de mes no sugiere que después ya no se pueda pagar", () => {
    const lastDay = render("ultimo_aviso", [item(11, false)]);
    expect(lastDay.html).not.toMatch(/último día para pagar/i);
    expect(lastDay.subject).not.toMatch(/último día/i);
    expect(lastDay.html).toContain("Hoy cierra el mes y siguen pendientes tus pagos");
  });

  it("el atrasado avisa de que se repite cada semana hasta regularizarse", () => {
    const late = render("atrasado", [item(10, true)]);
    expect(late.text).toContain("cada semana hasta que se regularice");
    expect(late.subject).toBe("Aviso: pagos atrasados — Jugador de Ejemplo");
  });

  it("separa en bloques lo atrasado de lo vencido cuando hay de las dos cosas", () => {
    const both = render("atrasado", [item(10, true), item(11, false)]);
    expect(both.html).toContain("Atrasado · mes ya terminado");
    expect(both.html).toContain("Vencido · plazo hasta fin de mes");
    expect(both.text).toContain("ATRASADO (mes ya terminado):");
    expect(both.text).toContain("Subtotal atrasado: 25,00");
    expect(both.text).toContain("Subtotal vencido: 25,00");
  });

  it("sin mezcla no pone encabezados de bloque", () => {
    const onlyLate = render("atrasado", [item(9, true), item(10, true)]);
    expect(onlyLate.html).not.toContain("Vencido · plazo hasta fin de mes");
    expect(onlyLate.html).not.toContain("Atrasado · mes ya terminado");
  });

  it("la introducción sigue al saludo en la misma línea y en minúscula", () => {
    const text = render("atrasado", [item(10, true)]).text;
    expect(text).toContain("Hola, constan como atrasados");
    expect(render("aviso", [item(11, false)]).text).toContain("Hola, tenemos pendiente");
    expect(render("ultimo_aviso", [item(11, false)]).text).toContain("Hola, hoy cierra el mes");
  });

  it("el pie junta el aviso de no responder y el contacto con el texto acordado", () => {
    const email = render("aviso", [item(11, false)]);
    const foot =
      "Este mensaje se ha enviado automáticamente y no admite respuestas. Si tienes dudas, problemas con el pago o con tu situación económica escríbenos o llámanos al 696 94 28 23";
    expect(email.html).toContain(foot);
    expect(email.text).toContain(foot);
    expect(email.html).not.toContain("Consúltalo con nosotros");
  });

  it("no hay cabecera aparte con el nombre del club: el logo va junto al texto de la franja", () => {
    const withLogo = renderCombinedReminderEmail({
      kind: "aviso",
      players: [{ playerName: "Jugador de Ejemplo", items: [item(11, false)], total: 25 }],
      instructions: "",
      logoUrl: "https://ejemplo.test/logo/email-logo-white.png",
    });
    expect(withLogo.html).toContain("email-logo-white.png");
    // El nombre del club solo aparece en la despedida, no en una cabecera.
    expect(withLogo.html.match(/C\.V\. Orotava - Puerto de la Cruz/g)).toHaveLength(1);
    expect(withLogo.html.indexOf("email-logo-white.png")).toBeLessThan(
      withLogo.html.indexOf("Recordatorio · día 10"),
    );
  });

  it("los avisos guardados antes de existir el campo late se tratan como vencidos", () => {
    const legacy = render("atrasado", [{ label: "Cuota mensual", month: 10, remaining: 25 }]);
    expect(legacy.html).not.toContain("Atrasado · mes ya terminado");
  });
});
