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

  it("los avisos guardados antes de existir el campo late se tratan como vencidos", () => {
    const legacy = render("atrasado", [{ label: "Cuota mensual", month: 10, remaining: 25 }]);
    expect(legacy.html).not.toContain("Atrasado · mes ya terminado");
  });
});
