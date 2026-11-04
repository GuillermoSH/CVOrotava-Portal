import { describe, expect, it } from "vitest";

import { checkEmail, firstEmailProblem } from "@/lib/payments/reminders/email-quality";

describe("checkEmail", () => {
  it("acepta correos normales, con mayúsculas y dominios raros pero reales", () => {
    expect(checkEmail("ana@gmail.com").ok).toBe(true);
    expect(checkEmail("CCC@GMAIL.COM").ok).toBe(true);
    expect(checkEmail("rana.rohit82@yahoo.in").ok).toBe(true);
    expect(checkEmail("familia@empresa.es").ok).toBe(true);
  });

  it("marca el relleno de uno o dos caracteres", () => {
    expect(checkEmail("a@yahoo.es")).toMatchObject({ ok: false, issue: "short-user" });
    expect(checkEmail("ab@gmail.com")).toMatchObject({ ok: false, issue: "short-user" });
  });

  it("marca erratas de dominio y sugiere el correcto", () => {
    const check = checkEmail("raulppi@homtail.com");
    expect(check).toMatchObject({ ok: false, issue: "typo-domain" });
    expect(check.ok ? "" : check.hint).toContain("hotmail.com");
    expect(checkEmail("x123@gmial.com")).toMatchObject({ ok: false, issue: "typo-domain" });
  });

  it("marca formatos inválidos", () => {
    expect(checkEmail("sinarroba.com")).toMatchObject({ ok: false, issue: "format" });
    expect(checkEmail("a@b")).toMatchObject({ ok: false, issue: "format" });
  });
});

describe("firstEmailProblem", () => {
  it("devuelve el primer correo dudoso o null", () => {
    expect(firstEmailProblem(["ana@gmail.com"])).toBeNull();
    expect(firstEmailProblem(["ana@gmail.com", "a@yahoo.es"])?.email).toBe("a@yahoo.es");
  });
});
