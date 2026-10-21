"use client";

import { useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/club/Badge";
import { Button } from "@/components/club/Button";
import { Input } from "@/components/club/Input";
import {
  previewRemindersAction,
  sendTestReminderAction,
} from "@/lib/actions/payments/reminders";
import { REMINDER_KIND_LABELS, renderReminderEmail } from "@/lib/payments/reminders/email";
import type { OwingPlayer, ReminderKind } from "@/lib/payments/reminders/plan";
import type { PlannedReminder } from "@/lib/payments/reminders/run";
import { formatOwingForWhatsapp } from "@/lib/payments/reminders/whatsapp-list";
import { appToast } from "@/lib/toast";

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

const KIND_BADGE: Record<ReminderKind, "warning" | "destructive" | "info"> = {
  aviso: "info",
  ultimo_aviso: "warning",
  atrasado: "destructive",
};

type Status = {
  emailConfigured: boolean;
  enabled: boolean;
  testTo: string | null;
  cronConfigured: boolean;
};

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Atajos relativos al mes de la fecha elegida: día 10, último día y el día 1 del siguiente. */
function shortcuts(current: string) {
  const [y, m] = current.split("-").map(Number);
  return [
    { label: "Día 10", value: dateKey(new Date(y, m - 1, 10)) },
    { label: "Último día", value: dateKey(new Date(y, m, 0)) },
    { label: "Día 1 siguiente", value: dateKey(new Date(y, m, 1)) },
  ];
}

function StatusNotes({ status }: { status: Status }) {
  const notes: { text: string; tone: "ok" | "warn" }[] = [
    status.emailConfigured
      ? { text: "Resend configurado (RESEND_API_KEY y RESEND_FROM_EMAIL).", tone: "ok" }
      : { text: "Falta RESEND_API_KEY o RESEND_FROM_EMAIL: no se puede enviar.", tone: "warn" },
    status.enabled
      ? { text: "Envío automático activado (PAYMENT_REMINDERS_ENABLED).", tone: "ok" }
      : { text: "Envío automático desactivado: el cron no manda nada hasta activarlo.", tone: "warn" },
    status.testTo
      ? { text: `Modo prueba: todo envío real se redirige a ${status.testTo}.`, tone: "warn" }
      : { text: "Sin modo prueba: los envíos reales irán a las familias.", tone: "ok" },
    status.cronConfigured
      ? { text: "CRON_SECRET configurado.", tone: "ok" }
      : { text: "Falta CRON_SECRET: el cron diario no podrá autenticarse.", tone: "warn" },
  ];

  return (
    <ul className="flex flex-col gap-1 text-sm">
      {notes.map((n) => (
        <li key={n.text} className={n.tone === "warn" ? "text-foreground" : "text-muted-foreground"}>
          <span aria-hidden>{n.tone === "warn" ? "⚠ " : "✓ "}</span>
          {n.text}
        </li>
      ))}
    </ul>
  );
}

export function RemindersPageClient({
  initialDate,
  initialPlans,
  initialOwing,
  instructions,
  status,
}: {
  initialDate: string;
  initialPlans: PlannedReminder[];
  initialOwing: OwingPlayer[];
  instructions: string;
  status: Status;
}) {
  const [date, setDate] = useState(initialDate);
  const [plans, setPlans] = useState(initialPlans);
  const [owing, setOwing] = useState(initialOwing);
  const [onlyLate, setOnlyLate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();
  const [sending, startSend] = useTransition();

  const selected = plans.find((p) => p.playerId === selectedId) ?? null;
  const noEmail = plans.filter((p) => p.recipients.length === 0).length;
  const counts = useMemo(() => {
    const out: Record<ReminderKind, number> = { aviso: 0, ultimo_aviso: 0, atrasado: 0 };
    for (const p of plans) out[p.kind] += 1;
    return out;
  }, [plans]);

  const email = useMemo(
    () =>
      selected
        ? renderReminderEmail({
            kind: selected.kind,
            playerName: selected.playerName,
            items: selected.items,
            total: selected.total,
            instructions,
          })
        : null,
    [selected, instructions],
  );

  function load(next: string) {
    setDate(next);
    setSelectedId(null);
    startLoad(async () => {
      const result = await previewRemindersAction(next);
      if (!result.ok) {
        appToast.error("No se pudo calcular", result.error);
        return;
      }
      setPlans(result.plans);
      setOwing(result.owing);
    });
  }

  const whatsappText = useMemo(
    () => formatOwingForWhatsapp({ owing, date, onlyLate }),
    [owing, date, onlyLate],
  );
  const whatsappCount = whatsappText ? whatsappText.split("\n").filter((l) => l.startsWith("•")).length : 0;

  async function copyWhatsapp() {
    try {
      await navigator.clipboard.writeText(whatsappText);
      appToast.success("Lista copiada", "Pégala en WhatsApp");
    } catch {
      appToast.error("No se pudo copiar", "Selecciona el texto y cópialo a mano");
    }
  }

  function sendTest() {
    if (!selected) return;
    startSend(async () => {
      const result = await sendTestReminderAction({ date, playerId: selected.playerId });
      if (result.ok) appToast.success("Prueba enviada", `Revisa ${result.to}`);
      else appToast.error("No se pudo enviar la prueba", result.error);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-lg border border-[var(--club-border)] bg-[var(--club-surface)]/60 p-4">
        <h2 className="section-title mb-2">Estado</h2>
        <StatusNotes status={status} />
        {!instructions ? (
          <p className="mt-2 text-sm text-foreground">
            ⚠ Sin instrucciones de pago (lib/payments/reminders/instructions.ts): los correos salen sin el bloque
            «Cómo pagar».
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Simular un día</h2>
        <p className="text-sm text-muted-foreground">
          Elige una fecha y verás qué avisos saldrían ese día con los pagos actuales, sin enviar
          nada. En la simulación no se tiene en cuenta lo ya enviado.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            className="min-h-11 w-auto"
            value={date}
            onChange={(e) => e.target.value && load(e.target.value)}
            aria-label="Fecha simulada"
          />
          {shortcuts(date).map((s) => (
            <Button
              key={s.label}
              type="button"
              variant="secondary"
              className="min-h-10"
              onClick={() => load(s.value)}
            >
              {s.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="secondary"
            className="min-h-10"
            onClick={() => load(dateKey(new Date()))}
          >
            Hoy
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-2" aria-busy={loading}>
        <p className="text-sm text-muted-foreground">
          {plans.length === 0
            ? "Ese día no sale ningún aviso."
            : `${plans.length} avisos · ${counts.aviso} día 10 · ${counts.ultimo_aviso} fin de mes · ${counts.atrasado} atrasados · ${noEmail} sin correo`}
        </p>

        {plans.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <ul className="flex max-h-[32rem] flex-col gap-1 overflow-y-auto rounded-lg border border-[var(--club-border)] p-1">
              {plans.map((p) => (
                <li key={p.playerId}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(p.playerId)}
                    aria-pressed={p.playerId === selectedId}
                    className={`flex w-full flex-col gap-1 rounded-md px-3 py-2 text-left transition-colors hover:bg-[var(--club-surface-2)] ${
                      p.playerId === selectedId ? "bg-[var(--club-surface-2)]" : ""
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{p.playerName}</span>
                      <span className="tabular-nums text-sm">{eur.format(p.total)}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={KIND_BADGE[p.kind]}>{REMINDER_KIND_LABELS[p.kind]}</Badge>
                      {p.recipients.length === 0 ? (
                        <span className="text-foreground">Sin correo registrado</span>
                      ) : (
                        <span className="truncate">{p.recipients.join(", ")}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex min-h-64 flex-col gap-2 rounded-lg border border-[var(--club-border)] p-3">
              {email && selected ? (
                <>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Asunto: </span>
                    <span className="font-medium text-foreground">{email.subject}</span>
                  </p>
                  <iframe
                    title="Previsualización del correo"
                    srcDoc={email.html}
                    sandbox=""
                    className="min-h-96 w-full flex-1 rounded-md border border-[var(--club-border)] bg-[var(--club-surface-2)]"
                  />
                  <Button
                    type="button"
                    className="min-h-10 self-start"
                    disabled={sending || !status.emailConfigured}
                    onClick={sendTest}
                  >
                    {sending ? "Enviando…" : "Enviarme esta prueba"}
                  </Button>
                </>
              ) : (
                <p className="m-auto text-sm text-muted-foreground">
                  Elige un jugador para ver el correo.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-3" aria-busy={loading}>
        <h2 className="section-title">Lista para WhatsApp</h2>
        <p className="text-sm text-muted-foreground">
          Quién falta por pagar y qué, según la fecha elegida arriba (todos los vencidos, salga o no
          aviso ese día). Agrupado por equipo. Ojo: si la pegas en un grupo con familias, verán
          quién debe.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-[var(--club-border)] accent-brand"
              checked={onlyLate}
              onChange={(e) => setOnlyLate(e.target.checked)}
            />
            Solo atrasados (mes ya terminado)
          </label>
          <Button
            type="button"
            className="min-h-10"
            disabled={!whatsappText}
            onClick={copyWhatsapp}
          >
            Copiar lista
          </Button>
          <span className="text-sm text-muted-foreground">
            {whatsappText ? `${whatsappCount} jugadores` : "Nadie con pagos pendientes"}
          </span>
        </div>
        {whatsappText ? (
          <textarea
            readOnly
            value={whatsappText}
            rows={12}
            className="form-input min-h-48 w-full font-mono text-sm"
            aria-label="Lista de pagos pendientes para WhatsApp"
            onFocus={(e) => e.currentTarget.select()}
          />
        ) : null}
      </section>
    </div>
  );
}
