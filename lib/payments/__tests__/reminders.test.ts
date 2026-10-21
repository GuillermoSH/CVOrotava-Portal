import { describe, expect, it } from "vitest";

import { renderReminderEmail } from "@/lib/payments/reminders/email";
import { listOwing, planReminders, type ReminderHistoryEntry } from "@/lib/payments/reminders/plan";
import { formatOwingForWhatsapp } from "@/lib/payments/reminders/whatsapp-list";
import type { FeeObligation } from "@/lib/payments/fees";
import type { PlayerFeeRow } from "@/lib/payments/player-fee-rows";

function obligation(over: Partial<FeeObligation>): FeeObligation {
  return {
    key: "mensualidad:10",
    code: "mensualidad",
    label: "Cuota mensual",
    kind: "monthly",
    month: 10,
    due: 25,
    paid: 0,
    remaining: 25,
    overdue: true,
    late: false,
    ...over,
  };
}

function row(id: string, obligations: FeeObligation[]): PlayerFeeRow {
  return {
    id,
    full_name: `Jugador ${id}`,
    short_name: id,
    team_name: "Cadete",
    audience: "base",
    obligations,
    payments: [],
    unassigned: { count: 0, total: 0 },
  };
}

const plan = (rows: PlayerFeeRow[], today: Date, history: ReminderHistoryEntry[] = []) =>
  planReminders({ rows, today, history });

describe("planReminders", () => {
  const vencida = row("a", [obligation({})]);
  const atrasada = row("b", [obligation({ overdue: true, late: true })]);

  it("el día 10 avisa a quien tiene algo vencido pero no atrasado", () => {
    const plans = plan([vencida, atrasada], new Date(2026, 9, 10));
    expect(plans.map((p) => [p.playerId, p.kind])).toEqual([
      ["a", "aviso"],
      ["b", "atrasado"],
    ]);
  });

  it("el último día del mes manda el último aviso", () => {
    const plans = plan([vencida], new Date(2026, 9, 31));
    expect(plans.map((p) => p.kind)).toEqual(["ultimo_aviso"]);
  });

  it("otros días del mes no hay aviso para lo solo vencido", () => {
    expect(plan([vencida], new Date(2026, 9, 20))).toEqual([]);
    expect(plan([vencida], new Date(2026, 9, 11))).toEqual([]);
  });

  it("en febrero el último día es el 28 (o 29 en bisiesto)", () => {
    expect(plan([vencida], new Date(2027, 1, 28)).map((p) => p.kind)).toEqual(["ultimo_aviso"]);
    expect(plan([vencida], new Date(2028, 1, 28))).toEqual([]);
    expect(plan([vencida], new Date(2028, 1, 29)).map((p) => p.kind)).toEqual(["ultimo_aviso"]);
  });

  it("lo atrasado sale en cuanto aparece y luego cada 7 días", () => {
    const first = plan([atrasada], new Date(2026, 10, 1));
    expect(first.map((p) => p.kind)).toEqual(["atrasado"]);

    const history: ReminderHistoryEntry[] = [{ player_id: "b", kind: "atrasado", sent_on: "2026-11-01" }];
    expect(plan([atrasada], new Date(2026, 10, 7), history)).toEqual([]);
    expect(plan([atrasada], new Date(2026, 10, 8), history).map((p) => p.kind)).toEqual(["atrasado"]);
  });

  it("no repite el mismo aviso el mismo día", () => {
    const history: ReminderHistoryEntry[] = [{ player_id: "a", kind: "aviso", sent_on: "2026-10-10" }];
    expect(plan([vencida], new Date(2026, 9, 10), history)).toEqual([]);
  });

  it("no avisa si no hay nada vencido pendiente ni a las bajas", () => {
    const alDia = row("c", [obligation({ remaining: 0, paid: 25 })]);
    const futura = row("d", [obligation({ overdue: false })]);
    expect(plan([alDia, futura], new Date(2026, 9, 10))).toEqual([]);

    const plans = planReminders({
      rows: [vencida],
      today: new Date(2026, 9, 10),
      history: [],
      excludePlayerIds: new Set(["a"]),
    });
    expect(plans).toEqual([]);
  });

  it("lista solo lo vencido y suma el total", () => {
    const mixed = row("e", [
      obligation({ month: 10, remaining: 25 }),
      obligation({ month: 11, remaining: 25, overdue: false }),
      obligation({ key: "matricula", code: "matricula", label: "Matrícula", kind: "once", month: null, remaining: 75 }),
    ]);
    const [p] = plan([mixed], new Date(2026, 9, 10));
    expect(p.items.map((i) => i.label)).toEqual(["Cuota mensual", "Matrícula"]);
    expect(p.total).toBe(100);
  });
});

describe("renderReminderEmail", () => {
  const base = {
    playerName: "Ana <b>",
    items: [{ label: "Cuota mensual", month: 10, remaining: 25 }],
    total: 25,
  };

  it("usa asunto y tono distintos por tipo y escapa el HTML", () => {
    const aviso = renderReminderEmail({ ...base, kind: "aviso", instructions: "" });
    const atrasado = renderReminderEmail({ ...base, kind: "atrasado", instructions: "" });
    expect(aviso.subject).not.toBe(atrasado.subject);
    expect(aviso.html).toContain("Ana &lt;b&gt;");
    expect(aviso.html).not.toContain("Ana <b>");
    expect(aviso.text).toContain("Cuota mensual — octubre");
  });

  it("incluye el bloque Cómo pagar solo si hay instrucciones", () => {
    const sin = renderReminderEmail({ ...base, kind: "aviso", instructions: "" });
    const con = renderReminderEmail({ ...base, kind: "aviso", instructions: "IBAN ES00" });
    expect(sin.html).not.toContain("Cómo pagar");
    expect(con.html).toContain("Cómo pagar");
    expect(con.text).toContain("IBAN ES00");
  });
});

describe("listOwing + formatOwingForWhatsapp", () => {
  const rows = [
    row("a", [
      obligation({ month: 10, late: true }),
      obligation({ month: 11, late: false }),
      obligation({ key: "matricula", code: "matricula", label: "Matrícula", kind: "once", month: null, remaining: 75, late: true }),
    ]),
    row("b", [obligation({ overdue: false })]),
    row("c", [obligation({ month: 11, late: false })]),
  ];

  it("lista a todos los que deben algo vencido, sin importar el día", () => {
    const owing = listOwing({ rows });
    expect(owing.map((o) => [o.playerId, o.total, o.hasLate])).toEqual([
      ["a", 125, true],
      ["c", 25, false],
    ]);
  });

  it("agrupa por equipo, junta los meses y cierra con el total", () => {
    const text = formatOwingForWhatsapp({ owing: listOwing({ rows }), date: "2026-11-15", onlyLate: false });
    expect(text).toContain("*Pagos pendientes — 15/11/2026*");
    expect(text).toContain("*Cadete*");
    expect(text).toContain("Jugador a — Cuota mensual (octubre, noviembre), Matrícula · 125,00");
    expect(text).toContain("2 jugadores · Total 150,00");
  });

  it("con onlyLate deja solo lo atrasado y descarta a quien no tiene nada atrasado", () => {
    const text = formatOwingForWhatsapp({ owing: listOwing({ rows }), date: "2026-11-15", onlyLate: true });
    expect(text).toContain("Jugador a — Cuota mensual (octubre), Matrícula · 100,00");
    expect(text).not.toContain("Jugador c");
    expect(
      formatOwingForWhatsapp({ owing: [], date: "2026-11-15", onlyLate: false }),
    ).toBe("");
  });
});
