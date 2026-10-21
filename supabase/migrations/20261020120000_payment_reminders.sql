-- Registro de avisos de pago enviados por correo (cron diario + pruebas no se registran).
-- Sirve para no repetir un aviso el mismo día y para espaciar los de "atrasado" cada 7 días.
-- Additive only: tabla propia del Portal, no toca payments (compartida con Team Manager).

create table if not exists public.payment_reminders (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  -- aviso = día 10 · ultimo_aviso = último día del mes · atrasado = mes ya terminado (cada 7 días)
  kind text not null check (kind in ('aviso', 'ultimo_aviso', 'atrasado')),
  sent_on date not null,
  recipients text[] not null default '{}',
  -- [{ label, month, remaining }] de lo que se avisó
  items jsonb not null default '[]'::jsonb,
  total numeric not null default 0,
  status text not null check (status in ('sent', 'failed')),
  provider_id text,
  error text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

comment on table public.payment_reminders is
  'Avisos de pago enviados por correo a las familias. Un envío correcto por jugador, tipo y día.';

create unique index if not exists payment_reminders_sent_unique_idx
  on public.payment_reminders (player_id, kind, sent_on)
  where status = 'sent';

create index if not exists payment_reminders_player_idx
  on public.payment_reminders (player_id, sent_on desc);

alter table public.payment_reminders enable row level security;

drop policy if exists payment_reminders_select_admin_manager on public.payment_reminders;
create policy payment_reminders_select_admin_manager on public.payment_reminders
  for select to authenticated
  using ((select public.has_portal_role(array['admin', 'manager'])));

-- Sin GRANT la policy no basta ("permission denied for table"): ver payment_concepts_grants.
-- Solo lee el Portal (authenticated); escribe el cron con service_role.
grant select on public.payment_reminders to authenticated;
grant select, insert, update on public.payment_reminders to service_role;

notify pgrst, 'reload schema';
