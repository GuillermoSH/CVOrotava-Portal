import { describe, expect, it } from "vitest";

import { buildPendingGroups, summarizeRoster } from "@/lib/dashboard/pending";
import type { PaymentsDashboard } from "@/lib/payments/dashboard-stats";
import type { PlayerListItem } from "@/lib/types/db";

function player(over: Partial<PlayerListItem> = {}): PlayerListItem {
  return {
    id: "p",
    full_name: "Ana Pérez",
    first_name: "Ana",
    last_name: "Pérez",
    birth_date: "2012-01-01",
    team_id: "t1",
    user_id: null,
    season: "2026-27",
    is_active: true,
    gender: "female",
    dni: "12345678Z",
    license_completed: true,
    registration_papers_received: true,
    docs_delivered_to_family: true,
    docs_delivered_at: null,
    photo_taken: true,
    photo_consent: true,
    photo_path: null,
    in_whatsapp_group: true,
    medical_notes: null,
    clothing_size: null,
    address: null,
    address_street_type: "calle",
    address_street: "Mayor",
    address_number: "1",
    address_door: null,
    address_postal_code: "38300",
    address_municipality: "La Orotava",
    address_province: "Santa Cruz de Tenerife",
    birth_country: null,
    nationality: null,
    pays_extended_monthly: false,
    team: null,
    primary_phone: "600000000",
    primary_email: "ana@club.es",
    ...over,
  } as PlayerListItem;
}

const payments: PaymentsDashboard = {
  seasonTotal: 1000,
  expectedTotal: 4000,
  onTariffTotal: 1000,
  overpaid: 0,
  unassigned: { count: 0, total: 0 },
  byMonth: [],
  withoutMatricula: { players: 0, amount: 0 },
  monthTotal: 0,
  monthly: null,
  overdueTotal: 0,
  overduePlayers: 0,
  debtors: [],
  recent: [],
};

const clothing = { openOrders: 0, pendingStorageLots: 0, pendingStorageUnits: 0 };

describe("buildPendingGroups", () => {
  it("no muestra nada cuando todo está al día", () => {
    expect(buildPendingGroups({ players: [player()], payments, clothing })).toEqual([]);
  });

  it("cuenta solo jugadores activos y explica las licencias bloqueadas", () => {
    const groups = buildPendingGroups({
      players: [
        player({ id: "a", license_completed: false, photo_taken: false }),
        player({ id: "b", license_completed: false }),
        player({ id: "baja", is_active: false, license_completed: false, photo_taken: false }),
      ],
      payments: null,
      clothing,
    });
    const items = groups.find((g) => g.id === "players")?.items ?? [];
    const license = items.find((i) => i.id === "license");
    expect(license?.count).toBe(2);
    expect(license?.detail).toContain("1 bloqueada");
    expect(items.find((i) => i.id === "photo")?.count).toBe(1);
    expect(license?.href).toContain("missing_license");
  });

  it("el rol sin acceso a pagos no ve el grupo de pagos", () => {
    const groups = buildPendingGroups({
      players: [player({ photo_taken: false })],
      payments: null,
      clothing: { openOrders: 2, pendingStorageLots: 0, pendingStorageUnits: 0 },
    });
    expect(groups.map((g) => g.id)).toEqual(["players", "clothing"]);
  });

  it("recoge pagos y ropa con su cifra y enlace", () => {
    const groups = buildPendingGroups({
      players: [],
      payments: {
        ...payments,
        overduePlayers: 76,
        overdueTotal: 2950,
        debtors: new Array(12).fill(null).map((_, i) => ({ id: String(i), name: "x", teamName: null, lateCount: 1, balance: 1 })),
        withoutMatricula: { players: 21, amount: 1575 },
        unassigned: { count: 38, total: 770 },
        overpaid: 375,
      },
      clothing: { openOrders: 1, pendingStorageLots: 3, pendingStorageUnits: 40 },
    });
    expect(groups.map((g) => g.id)).toEqual(["payments", "clothing"]);
    const pay = groups[0].items;
    expect(pay.map((i) => i.id)).toEqual(["overdue", "matricula", "unassigned", "overpaid"]);
    expect(pay[0]).toMatchObject({ count: 76, valueLabel: "76 jugadores" });
    expect(pay.map((i) => i.href)).toEqual([
      "/admin/pagos/control#vencidos",
      "/admin/pagos/control#matricula",
      "/admin/pagos/control#sin-concepto",
      "/admin/pagos/control#cobrado-de-mas",
    ]);
    expect(pay[3].valueLabel).toContain("375");
    const storage = groups[1].items.find((i) => i.id === "storage");
    expect(storage?.valueLabel).toBe("40 unidades");
  });
});

describe("summarizeRoster", () => {
  it("cuenta altas completas entre los activos", () => {
    const s = summarizeRoster([
      player({ id: "a" }),
      player({ id: "b", license_completed: false }),
      player({ id: "c", is_active: false, license_completed: false }),
    ]);
    expect(s).toEqual({ active: 2, complete: 1, incomplete: 1 });
  });
});
