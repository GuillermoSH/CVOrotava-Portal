import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  deliveryStatusFromEvent,
  shouldReplaceStatus,
  verifySvixSignature,
} from "@/lib/payments/reminders/webhook";

const rawKey = Buffer.from("clave-de-prueba-0123456789");
const secret = `whsec_${rawKey.toString("base64")}`;
const now = 1_800_000_000_000;
const ts = String(Math.floor(now / 1000));
const body = JSON.stringify({ type: "email.bounced", data: { email_id: "re_1" } });
const sign = (id: string, t: string, b: string) =>
  createHmac("sha256", rawKey).update(`${id}.${t}.${b}`).digest("base64");

describe("verifySvixSignature", () => {
  it("acepta una firma correcta", () => {
    const signature = `v1,${sign("msg_1", ts, body)}`;
    expect(verifySvixSignature({ secret, id: "msg_1", timestamp: ts, signature, body, now })).toBe(true);
  });

  it("acepta si una de varias firmas coincide", () => {
    const signature = `v1,AAAA v1,${sign("msg_1", ts, body)}`;
    expect(verifySvixSignature({ secret, id: "msg_1", timestamp: ts, signature, body, now })).toBe(true);
  });

  it("rechaza cuerpo alterado, firma ajena y datos que faltan", () => {
    const signature = `v1,${sign("msg_1", ts, body)}`;
    expect(verifySvixSignature({ secret, id: "msg_1", timestamp: ts, signature, body: body + " ", now })).toBe(false);
    expect(verifySvixSignature({ secret, id: "msg_2", timestamp: ts, signature, body, now })).toBe(false);
    expect(verifySvixSignature({ secret, id: null, timestamp: ts, signature, body, now })).toBe(false);
    expect(verifySvixSignature({ secret, id: "msg_1", timestamp: ts, signature: null, body, now })).toBe(false);
  });

  it("rechaza mensajes con la marca de tiempo vieja", () => {
    const old = String(Math.floor(now / 1000) - 3600);
    const signature = `v1,${sign("msg_1", old, body)}`;
    expect(verifySvixSignature({ secret, id: "msg_1", timestamp: old, signature, body, now })).toBe(false);
  });
});

describe("deliveryStatusFromEvent / shouldReplaceStatus", () => {
  it("traduce los eventos que importan e ignora el resto", () => {
    expect(deliveryStatusFromEvent("email.delivered")).toBe("delivered");
    expect(deliveryStatusFromEvent("email.bounced")).toBe("bounced");
    expect(deliveryStatusFromEvent("contact.created")).toBeNull();
  });

  it("no retrocede el estado, pero un rebote siempre manda", () => {
    expect(shouldReplaceStatus(null, "sent")).toBe(true);
    expect(shouldReplaceStatus("delivered", "delivery_delayed")).toBe(false);
    expect(shouldReplaceStatus("delivery_delayed", "delivered")).toBe(true);
    expect(shouldReplaceStatus("delivered", "bounced")).toBe(true);
  });
});
