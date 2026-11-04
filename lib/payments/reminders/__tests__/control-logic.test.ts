import { describe, expect, it } from "vitest";

import {
  describeDelivery,
  groupLogByEmail,
  nextReminder,
  type LogRow,
} from "@/lib/payments/reminders/control-logic";

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe("nextReminder", () => {
  it("atrasado sin aviso previo: en el próximo pase", () => {
    expect(nextReminder({ today: d(2026, 11, 12), hasLate: true, lastLateSent: null, avisoSentThisMonth: false })).toEqual({
      kind: "atrasado",
      on: "2026-11-12",
    });
  });

  it("atrasado: 7 días después del último", () => {
    expect(
      nextReminder({ today: d(2026, 11, 12), hasLate: true, lastLateSent: "2026-11-10", avisoSentThisMonth: false }),
    ).toEqual({ kind: "atrasado", on: "2026-11-17" });
  });

  it("atrasado ya vencido el plazo de 7 días: hoy", () => {
    expect(
      nextReminder({ today: d(2026, 11, 20), hasLate: true, lastLateSent: "2026-11-10", avisoSentThisMonth: false }).on,
    ).toBe("2026-11-20");
  });

  it("antes del día 10 el aviso toca el día 10", () => {
    expect(nextReminder({ today: d(2026, 11, 4), hasLate: false, lastLateSent: null, avisoSentThisMonth: false })).toEqual({
      kind: "aviso",
      on: "2026-11-10",
    });
  });

  it("desde el 10 sin aviso este mes: hoy; con aviso hecho: último aviso a fin de mes", () => {
    expect(nextReminder({ today: d(2026, 11, 12), hasLate: false, lastLateSent: null, avisoSentThisMonth: false }).kind).toBe(
      "aviso",
    );
    expect(nextReminder({ today: d(2026, 11, 12), hasLate: false, lastLateSent: null, avisoSentThisMonth: true })).toEqual({
      kind: "ultimo_aviso",
      on: "2026-11-30",
    });
  });
});

describe("groupLogByEmail", () => {
  const base = {
    kind: "aviso" as const,
    sent_on: "2026-11-10",
    recipients: ["a@x.com"],
    total: 30,
    status: "sent" as const,
    error: null,
    delivery_status: null,
    created_at: "2026-11-10T19:00:00Z",
  };
  const rows: LogRow[] = [
    { ...base, id: "1", player_id: "p1", player_name: "Ana", provider_id: "re_1" },
    { ...base, id: "2", player_id: "p2", player_name: "Luis", provider_id: "re_1" },
    { ...base, id: "3", player_id: "p3", player_name: "Eva", provider_id: "re_2", created_at: "2026-11-10T19:01:00Z" },
  ];

  it("junta las filas de un mismo correo y suma el total", () => {
    const out = groupLogByEmail(rows);
    expect(out).toHaveLength(2);
    const combined = out.find((e) => e.key === "re_1");
    expect(combined?.players).toEqual(["Ana", "Luis"]);
    expect(combined?.total).toBe(60);
  });

  it("ordena lo más reciente primero", () => {
    expect(groupLogByEmail(rows)[0].key).toBe("re_2");
  });
});

describe("describeDelivery", () => {
  it("clasifica los estados de Resend", () => {
    expect(describeDelivery("delivered").tone).toBe("ok");
    expect(describeDelivery("bounced").tone).toBe("bad");
    expect(describeDelivery("delivery_delayed").tone).toBe("pending");
    expect(describeDelivery(null).label).toBe("Sin comprobar");
  });
});
