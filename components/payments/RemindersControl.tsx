import Link from "next/link";

import { Badge } from "@/components/club/Badge";
import { RefreshDeliveryButton } from "@/components/payments/RefreshDeliveryButton";
import { appRoutes } from "@/lib/constants";
import { describeDelivery, type DeliveryTone, type LoggedEmail } from "@/lib/payments/reminders/control-logic";
import type { DebtorControl, ReminderControl } from "@/lib/payments/reminders/control";
import { REMINDER_KIND_LABELS } from "@/lib/payments/reminders/email";
import type { ReminderKind } from "@/lib/payments/reminders/plan";

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const dayFormat = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });
const dateTimeFormat = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Atlantic/Canary",
});

function day(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return dayFormat.format(new Date(y, m - 1, d));
}

const TONE_BADGE: Record<DeliveryTone, "success" | "destructive" | "secondary"> = {
  ok: "success",
  bad: "destructive",
  pending: "secondary",
};

const KIND_BADGE: Record<ReminderKind, "warning" | "destructive" | "info"> = {
  aviso: "info",
  ultimo_aviso: "warning",
  atrasado: "destructive",
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

function playerHref(id: string) {
  return appRoutes.players.detail(id);
}

function Attention({ control }: { control: ReminderControl }) {
  const bounced = control.log.filter((e) => describeDelivery(e.deliveryStatus).tone === "bad" && e.status === "sent");
  const failed = control.log.filter((e) => e.status === "failed");
  const noEmail = control.debtors.filter((d) => d.recipients.length === 0);
  const doubtful = control.debtors.filter((d) => d.emailProblem);

  if (bounced.length + failed.length + noEmail.length + doubtful.length === 0) {
    return <p className="text-sm text-muted-foreground">Nada que revisar: todos los avisos tienen destino y ninguno ha fallado.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-[var(--club-border)] rounded-lg border border-[var(--club-border)]">
      {bounced.map((e) => (
        <li key={e.key} className="flex flex-col gap-0.5 px-4 py-3 text-sm">
          <span className="font-medium text-foreground">Rebotado · {e.players.join(", ")}</span>
          <span className="text-muted-foreground">{e.recipients.join(", ")} · {describeDelivery(e.deliveryStatus).label}. Corrige el correo en la ficha.</span>
        </li>
      ))}
      {failed.map((e) => (
        <li key={e.key} className="flex flex-col gap-0.5 px-4 py-3 text-sm">
          <span className="font-medium text-foreground">No se pudo enviar · {e.players.join(", ")}</span>
          <span className="text-muted-foreground">{e.error ?? "Error desconocido"}</span>
        </li>
      ))}
      {doubtful.map((d) => (
        <li key={`d-${d.playerId}`} className="flex flex-col gap-0.5 px-4 py-3 text-sm">
          <span className="font-medium text-foreground">
            Correo dudoso · <Link href={playerHref(d.playerId)} className="text-brand hover:underline">{d.playerName}</Link>
          </span>
          <span className="text-muted-foreground">{d.emailProblem?.email} · {d.emailProblem?.hint}</span>
        </li>
      ))}
      {noEmail.map((d) => (
        <li key={`n-${d.playerId}`} className="flex flex-col gap-0.5 px-4 py-3 text-sm">
          <span className="font-medium text-foreground">
            Sin correo · <Link href={playerHref(d.playerId)} className="text-brand hover:underline">{d.playerName}</Link>
          </span>
          <span className="text-muted-foreground">Debe {eur.format(d.total)} y no recibe avisos: avísale por WhatsApp.</span>
        </li>
      ))}
    </ul>
  );
}

function nextLabel(d: DebtorControl, today: string): string {
  if (d.recipients.length === 0) return "Sin correo: solo WhatsApp";
  if (d.dueNow) return "En el próximo pase";
  if (d.next.on <= today) return "En el próximo pase";
  return `${REMINDER_KIND_LABELS[d.next.kind]} · ${day(d.next.on)}`;
}

function Debtors({ control }: { control: ReminderControl }) {
  if (control.debtors.length === 0) {
    return <p className="text-sm text-muted-foreground">Nadie tiene pagos vencidos sin cobrar.</p>;
  }
  const sorted = [...control.debtors].sort((a, b) => Number(b.hasLate) - Number(a.hasLate) || b.total - a.total);
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--club-border)]">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b border-[var(--club-border)]">
            <th className="px-4 py-2 font-medium">Jugador</th>
            <th className="px-4 py-2 text-right font-medium">Debe</th>
            <th className="px-4 py-2 font-medium">Último aviso</th>
            <th className="px-4 py-2 font-medium">Siguiente</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--club-border)]">
          {sorted.map((d) => (
            <tr key={d.playerId}>
              <td className="px-4 py-2">
                <Link href={playerHref(d.playerId)} className="font-medium text-foreground hover:underline">{d.playerName}</Link>
                <span className="block text-xs text-muted-foreground">{d.teamName ?? "Sin equipo"}</span>
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {eur.format(d.total)}
                {d.hasLate ? <span className="block text-xs text-foreground">Atrasado</span> : null}
              </td>
              <td className="px-4 py-2">
                {d.lastSent ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge variant={KIND_BADGE[d.lastSent.kind]}>{REMINDER_KIND_LABELS[d.lastSent.kind]}</Badge>
                    <span className="text-muted-foreground">{day(d.lastSent.on)}</span>
                    {d.lastSent.deliveryStatus ? (
                      <Badge variant={TONE_BADGE[describeDelivery(d.lastSent.deliveryStatus).tone]}>
                        {describeDelivery(d.lastSent.deliveryStatus).label}
                      </Badge>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Ninguno todavía</span>
                )}
              </td>
              <td className="px-4 py-2 text-muted-foreground">{nextLabel(d, control.today)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Log({ log, hasDeliveryColumn }: { log: LoggedEmail[]; hasDeliveryColumn: boolean }) {
  if (log.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no se ha enviado ningún aviso real.</p>;
  }
  return (
    <ul className="flex max-h-[32rem] flex-col divide-y divide-[var(--club-border)] overflow-y-auto rounded-lg border border-[var(--club-border)]">
      {log.map((e) => {
        const delivery = describeDelivery(e.deliveryStatus);
        return (
          <li key={e.key} className="flex flex-col gap-1 px-4 py-3 text-sm">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-foreground">{e.players.join(", ")}</span>
              <span className="tabular-nums text-foreground">{eur.format(e.total)}</span>
            </span>
            <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {e.kinds.map((k) => (
                <Badge key={k} variant={KIND_BADGE[k]}>{REMINDER_KIND_LABELS[k]}</Badge>
              ))}
              {e.status === "failed" ? (
                <Badge variant="destructive">No enviado</Badge>
              ) : hasDeliveryColumn ? (
                <Badge variant={TONE_BADGE[delivery.tone]}>{delivery.label}</Badge>
              ) : null}
              <span>{dateTimeFormat.format(new Date(e.createdAt))}</span>
              <span className="truncate">{e.recipients.join(", ")}</span>
            </span>
            {e.status === "failed" && e.error ? <span className="text-xs text-foreground">{e.error}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

export function RemindersControl({ control }: { control: ReminderControl }) {
  const { quota, totals } = control;
  const dueNow = control.debtors.filter((d) => d.dueNow && d.recipients.length > 0).length;

  return (
    <div className="flex flex-col gap-6">
      {!control.hasDeliveryColumn ? (
        <p className="rounded-lg border border-[var(--club-border)] p-3 text-sm text-foreground">
          ⚠ Falta aplicar la migración <code>20261104120000_payment_reminders_delivery.sql</code> en Supabase para
          ver entregas y rebotes.
        </p>
      ) : null}

      <div className="grid grid-cols-2 divide-x divide-y divide-[var(--club-border)] overflow-hidden rounded-lg border border-[var(--club-border)] md:grid-cols-5 md:divide-y-0">
        <Stat label="Correos hoy" value={`${quota.sentToday}/${quota.limit}`} hint="Tope diario de Resend" />
        <Stat label="Toca enviar" value={String(dueNow)} hint="En el próximo pase" />
        <Stat label="Enviados (30 días)" value={String(totals.emails30d)} hint={totals.failed30d ? `${totals.failed30d} fallidos` : undefined} />
        <Stat label="Entregados" value={String(totals.delivered)} hint={totals.unchecked ? `${totals.unchecked} sin comprobar` : undefined} />
        <Stat label="Rebotados" value={String(totals.bounced)} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Requiere atención</h2>
        <Attention control={control} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Deudores y siguiente aviso</h2>
        <p className="text-sm text-muted-foreground">
          Los atrasados se repiten cada 7 días; el resto, aviso desde el día 10 y último aviso a fin de mes.
        </p>
        <Debtors control={control} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Registro de envíos</h2>
          {control.hasDeliveryColumn ? <RefreshDeliveryButton /> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {control.lastRunAt ? `Último envío: ${dateTimeFormat.format(new Date(control.lastRunAt))}. ` : ""}
          Un correo con varios hermanos aparece una sola vez.
        </p>
        <Log log={control.log} hasDeliveryColumn={control.hasDeliveryColumn} />
      </section>
    </div>
  );
}
