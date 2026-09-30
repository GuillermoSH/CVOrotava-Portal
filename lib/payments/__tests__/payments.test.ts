import { describe, expect, it } from "vitest";

import { mapPayment, type PaymentRow } from "@/lib/payments/mappers";
import { MATRICULA_CONCEPT, PAYMENT_CONCEPTS, PAYMENT_METHODS } from "@/lib/payments/constants";
import { registerPaymentSchema } from "@/lib/payments/schemas";

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

describe("payments constants", () => {
  it("keeps Matrícula as one of the offered concepts", () => {
    expect(PAYMENT_CONCEPTS).toContain(MATRICULA_CONCEPT);
  });

  it("only offers transferencia/efectivo as methods", () => {
    expect(PAYMENT_METHODS).toEqual(["transferencia", "efectivo"]);
  });
});
