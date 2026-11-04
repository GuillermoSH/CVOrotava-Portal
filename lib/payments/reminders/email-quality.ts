/**
 * Detecta correos de contacto que probablemente estén mal escritos o sean un relleno
 * («a@yahoo.es», «homtail.com»). Lógica pura, sin base de datos. No bloquea nada: solo avisa.
 */

export type EmailIssue = "format" | "short-user" | "typo-domain";

export type EmailCheck = { ok: true } | { ok: false; issue: EmailIssue; hint: string };

const COMMON_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "hotmail.es",
  "outlook.com",
  "outlook.es",
  "yahoo.com",
  "yahoo.es",
  "icloud.com",
  "live.com",
  "msn.com",
  "telefonica.net",
  "movistar.es",
  "gmx.com",
  "proton.me",
  "protonmail.com",
];

function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      // Dos letras intercambiadas (homtail → hotmail) cuentan como una sola errata.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

export function checkEmail(raw: string): EmailCheck {
  const email = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, issue: "format", hint: "No parece un correo válido" };
  }
  const [user, domain] = email.split("@");
  if (user.length <= 2) {
    return { ok: false, issue: "short-user", hint: "Parte anterior a la @ demasiado corta: ¿es un relleno?" };
  }
  if (!COMMON_DOMAINS.includes(domain)) {
    const near = COMMON_DOMAINS.find((d) => distance(domain, d) === 1);
    if (near) return { ok: false, issue: "typo-domain", hint: `Dominio raro: ¿quisiste decir ${near}?` };
  }
  return { ok: true };
}

/** El primer problema de la lista de correos de una familia, o null si todos parecen correctos. */
export function firstEmailProblem(emails: readonly string[]): { email: string; hint: string } | null {
  for (const email of emails) {
    const check = checkEmail(email);
    if (!check.ok) return { email, hint: check.hint };
  }
  return null;
}
