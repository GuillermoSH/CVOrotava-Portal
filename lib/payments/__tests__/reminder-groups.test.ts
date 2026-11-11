import { describe, expect, it } from "vitest";

import { renderCombinedReminderEmail } from "@/lib/payments/reminders/email";
import { groupByDestination, prioritizeGroups, type ReminderPlan } from "@/lib/payments/reminders/plan";
import { countEmailsFromRows } from "@/lib/payments/reminders/repository";

type Plan = ReminderPlan & { recipients: string[] };

const plan = (id: string, name: string, kind: Plan["kind"], total: number, recipients: string[]): Plan => ({
  playerId: id,
  playerName: name,
  teamName: null,
  kind,
  items: [{ label: "Cuota mensual", month: 10, remaining: total }],
  total,
  recipients,
});

describe("groupByDestination", () => {
  it("junta a los hermanos con el mismo destino, sin importar mayúsculas ni orden", () => {
    const groups = groupByDestination([
      plan("a", "Luis Pérez", "atrasado", 25, ["Mama@x.es", "papa@x.es"]),
      plan("b", "Ana Pérez", "aviso", 30, ["papa@x.es", "mama@x.es"]),
      plan("c", "Otra", "atrasado", 25, ["otra@x.es"]),
    ]);
    expect(groups).toHaveLength(2);
    const family = groups.find((g) => g.plans.length === 2);
    expect(family?.plans.map((p) => p.playerName)).toEqual(["Ana Pérez", "Luis Pérez"]);
    expect(family?.total).toBe(55);
    // el tono del correo es el del aviso más grave
    expect(family?.kind).toBe("atrasado");
  });

  it("no mezcla destinos que solo comparten una dirección", () => {
    const groups = groupByDestination([
      plan("a", "Uno", "atrasado", 25, ["a@x.es"]),
      plan("b", "Dos", "atrasado", 25, ["a@x.es", "b@x.es"]),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("ignora a quien no tiene correo", () => {
    expect(groupByDestination([plan("a", "Sin correo", "aviso", 25, [])])).toEqual([]);
  });

  it("ordena los correos: el aviso más urgente de cada grupo y luego la deuda mayor", () => {
    const ordered = prioritizeGroups(
      groupByDestination([
        plan("a", "A", "atrasado", 90, ["a@x.es"]),
        plan("b", "B", "ultimo_aviso", 25, ["b@x.es"]),
        plan("c", "C", "aviso", 25, ["c@x.es"]),
        plan("d", "D", "atrasado", 120, ["d@x.es"]),
      ]),
    );
    expect(ordered.map((g) => g.plans[0].playerId)).toEqual(["b", "c", "d", "a"]);
  });
});

describe("renderCombinedReminderEmail", () => {
  const players = [
    { playerName: "Ana Pérez", items: [{ label: "Cuota mensual", month: 10, remaining: 25 }], total: 25 },
    { playerName: "Luis <b> Pérez", items: [{ label: "Matrícula", month: null, remaining: 75 }], total: 75 },
  ];

  it("lleva a todos los jugadores, sus subtotales y un total común", () => {
    const email = renderCombinedReminderEmail({ kind: "atrasado", players, instructions: "" });
    expect(email.subject).toBe("Aviso: pagos atrasados — Ana Pérez y Luis <b> Pérez");
    expect(email.text).toContain("Jugador/a: Ana Pérez");
    expect(email.text).toContain("Jugador/a: Luis <b> Pérez");
    expect(email.text).toContain("Total pendiente: 100,00");
    expect(email.html).toContain("Luis &lt;b&gt; Pérez");
    expect(email.html).not.toContain("Luis <b> Pérez");
    expect(email.html.match(/Subtotal/g)).toHaveLength(2);
  });

  it("con un solo jugador no añade subtotal", () => {
    const email = renderCombinedReminderEmail({ kind: "aviso", players: players.slice(0, 1), instructions: "" });
    expect(email.html).not.toContain("Subtotal");
    expect(email.subject).toBe("Recordatorio de pago — Ana Pérez");
  });

  it("si los avisos son de tipos distintos usa una introducción neutra", () => {
    const mixed = renderCombinedReminderEmail({ kind: "atrasado", mixed: true, players, instructions: "" });
    const same = renderCombinedReminderEmail({ kind: "atrasado", players, instructions: "" });
    expect(mixed.text).toContain("pagos pendientes de la temporada");
    expect(mixed.text).not.toContain("constan como atrasados");
    expect(same.text).toContain("constan como atrasados");
  });
});

describe("countEmailsFromRows", () => {
  it("cuenta una vez el correo combinado aunque deje una fila por jugador", () => {
    const rows = [
      { recipients: ["a@x.es", "b@x.es"], provider_id: "id1" },
      { recipients: ["a@x.es", "b@x.es"], provider_id: "id1" },
      { recipients: ["c@x.es"], provider_id: "id2" },
    ];
    expect(countEmailsFromRows(rows)).toBe(3);
  });

  it("las filas sin id del proveedor cuentan cada una", () => {
    expect(countEmailsFromRows([{ recipients: ["a@x.es"], provider_id: null }, { recipients: ["b@x.es"], provider_id: null }])).toBe(2);
  });
});
