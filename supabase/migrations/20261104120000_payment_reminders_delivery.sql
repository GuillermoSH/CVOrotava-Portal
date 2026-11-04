-- Estado de entrega de cada aviso según Resend (delivered, bounced, complained…).
-- Additive only: tabla propia del Portal. Lo rellena la página de control al consultar a Resend.

alter table public.payment_reminders
  add column if not exists delivery_status text,
  add column if not exists delivery_checked_at timestamptz;

comment on column public.payment_reminders.delivery_status is
  'Último evento de Resend para el correo (delivered, bounced, complained, delivery_delayed, sent…). Null = sin comprobar.';

create index if not exists payment_reminders_sent_on_idx
  on public.payment_reminders (sent_on desc);

notify pgrst, 'reload schema';
