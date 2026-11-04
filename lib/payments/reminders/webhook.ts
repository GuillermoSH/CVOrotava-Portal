import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Webhook de Resend (firmado con Svix): verificación de la firma y traducción de eventos al
 * estado de entrega que guardamos en `payment_reminders.delivery_status`. Lógica pura.
 */

/** Margen de reloj admitido entre Resend y nosotros (evita repeticiones de un mensaje viejo). */
const TOLERANCE_SECONDS = 5 * 60;

export function verifySvixSignature({
  secret,
  id,
  timestamp,
  signature,
  body,
  now = Date.now(),
}: {
  /** `whsec_…` tal como lo da el panel de Resend. */
  secret: string;
  id: string | null;
  timestamp: string | null;
  /** Cabecera `svix-signature`: «v1,firma v1,otra…». */
  signature: string | null;
  /** Cuerpo exacto, sin parsear. */
  body: string;
  now?: number;
}): boolean {
  if (!id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > TOLERANCE_SECONDS) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();

  return signature.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** Evento de Resend → estado guardado. Los eventos que no importan devuelven null. */
export function deliveryStatusFromEvent(type: string): string | null {
  switch (type) {
    case "email.sent":
      return "sent";
    case "email.delivered":
      return "delivered";
    case "email.delivery_delayed":
      return "delivery_delayed";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    case "email.failed":
      return "failed";
    case "email.suppressed":
      return "suppressed";
    case "email.opened":
      return "opened";
    case "email.clicked":
      return "clicked";
    default:
      return null;
  }
}

const RANK: Record<string, number> = {
  sent: 0,
  delivery_delayed: 1,
  delivered: 2,
  opened: 3,
  clicked: 4,
  bounced: 5,
  complained: 5,
  failed: 5,
  suppressed: 5,
};

/**
 * Los eventos pueden llegar desordenados (un «retrasado» después de «entregado»): solo se
 * sustituye el estado si el nuevo no retrocede. Un rebote o una queja mandan siempre.
 */
export function shouldReplaceStatus(current: string | null, next: string): boolean {
  if (!current) return true;
  return (RANK[next] ?? 0) >= (RANK[current] ?? 0);
}
