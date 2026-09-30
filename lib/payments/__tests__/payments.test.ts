import { describe, expect, it } from "vitest";

import { pickDefaultConceptId } from "@/lib/payments/concept-selection";
import { mapPayment, type PaymentRow } from "@/lib/payments/mappers";
import { OTHER_CONCEPT_VALUE, PAYMENT_METHODS } from "@/lib/payments/constants";
import { registerPaymentSchema } from "@/lib/payments/schemas";
import type { PaymentConcept } from "@/lib/types/db";

describe("registerPaymentSchema", () => {
  const valid = {
    player_id: "123e4567-e89b-12d3-a456-426614174000",
    concept: "Matrícula",
    amount: 45,
    paid_date: "2026-09-30",
    method: "transferencia",
  };

  it("accepts a well-formed payment", () => {
    const parsed = registerPaymentSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.amount).toBe(45);
      expect(parsed.data.notes).toBeUndefined();
    }
  });

  it("coerces a numeric-string amount", () => {
    const parsed = registerPaymentSchema.safeParse({ ...valid, amount: "45" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.amount).toBe(45);
  });

  it("rejects a non-positive amount", () => {
    expect(registerPaymentSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    expect(registerPaymentSchema.safeParse({ ...valid, amount: -5 }).success).toBe(false);
  });

  it("rejects an invalid player_id", () => {
    expect(registerPaymentSchema.safeParse({ ...valid, player_id: "not-a-uuid" }).success).toBe(
      false,
    );
  });

  it("rejects a malformed paid_date", () => {
    expect(registerPaymentSchema.safeParse({ ...valid, paid_date: "30/09/2026" }).success).toBe(
      false,
    );
  });

  it("rejects an empty concept", () => {
    expect(registerPaymentSchema.safeParse({ ...valid, concept: "   " }).success).toBe(false);
  });

  it("rejects a method outside the fixed set", () => {
    expect(registerPaymentSchema.safeParse({ ...valid, method: "bizum" }).success).toBe(false);
  });

  it("accepts optional notes", () => {
    const parsed = registerPaymentSchema.safeParse({ ...valid, notes: "Pago en mano" });
    expect(parsed.success).toBe(true);
  });
});

describe("mapPayment", () => {
  const row: PaymentRow = {
    id: "p1",
    user_id: null,
    player_id: "pl1",
    concept: "Matrícula",
    amount: "45.00",
    status: "paid",
    due_date: null,
    paid_date: "2026-09-30",
    notes: null,
    created_at: "2026-09-30T10:00:00Z",
    updated_at: "2026-09-30T10:00:00Z",
    season: "2026-27",
    method: "transferencia",
  };

  it("coerces a string numeric amount to a number", () => {
    expect(mapPayment(row).amount).toBe(45);
  });

  it("keeps a numeric amount as-is", () => {
    expect(mapPayment({ ...row, amount: 45 }).amount).toBe(45);
  });

  it("passes through the rest of the fields", () => {
    const payment = mapPayment(row);
    expect(payment.concept).toBe("Matrícula");
    expect(payment.status).toBe("paid");
    expect(payment.method).toBe("transferencia");
    expect(payment.season).toBe("2026-27");
  });
});

describe("pickDefaultConceptId", () => {
  const base: Omit<PaymentConcept, "id" | "concept" | "amount" | "is_matricula"> = {
    is_active: true,
    sort_order: 0,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  };
  const cuota25: PaymentConcept = {
    ...base,
    id: "cuota25",
    concept: "Cuota mensual",
    amount: 25,
    is_matricula: false,
  };
  const cuota30: PaymentConcept = {
    ...base,
    id: "cuota30",
    concept: "Cuota mensual",
    amount: 30,
    is_matricula: false,
  };
  const matricula: PaymentConcept = {
    ...base,
    id: "matricula",
    concept: "Matrícula",
    amount: 75,
    is_matricula: true,
  };
  const pagoUnico: PaymentConcept = {
    ...base,
    id: "pago-unico",
    concept: "Pago único",
    amount: 90,
    is_matricula: false,
  };
  const concepts = [cuota25, cuota30, matricula, pagoUnico];

  it("picks the base cuota (25 €) for players without the extended fee", () => {
    expect(pickDefaultConceptId(concepts, { pays_extended_monthly: false })).toBe("cuota25");
  });

  it("picks the extended cuota (30 €) for players with pays_extended_monthly", () => {
    expect(pickDefaultConceptId(concepts, { pays_extended_monthly: true })).toBe("cuota30");
  });

  it("falls back to the matrícula concept when there is no amount-variant group", () => {
    expect(pickDefaultConceptId([matricula, pagoUnico], { pays_extended_monthly: false })).toBe(
      "matricula",
    );
  });

  it("falls back to the first concept when none is flagged as matrícula", () => {
    expect(pickDefaultConceptId([pagoUnico], { pays_extended_monthly: false })).toBe("pago-unico");
  });

  it("falls back to Otro when there are no concepts at all", () => {
    expect(pickDefaultConceptId([], { pays_extended_monthly: false })).toBe(OTHER_CONCEPT_VALUE);
  });
});

describe("payments constants", () => {
  it("only offers transferencia/efectivo as methods", () => {
    expect(PAYMENT_METHODS).toEqual(["transferencia", "efectivo"]);
  });
});
