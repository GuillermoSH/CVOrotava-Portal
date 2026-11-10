-- Anulación de lo pendiente de un concepto (ausencias, cambio de cuota…).
-- Es ADITIVA y REVERSIBLE: no modifica ni borra ningún cobro de `payments` (tabla compartida
-- con Team Manager). El pendiente se sigue calculando = tarifa − cobros anotados − importe
-- anulado; borrar la fila de aquí devuelve el pendiente tal cual estaba.
-- billing_month: mes natural (1–12) para mensualidades; 0 para conceptos únicos.
-- Cerrada a `authenticated` (el motivo puede ser sensible): solo service role, como
-- payment_exemptions.

create table if not exists public.payment_waivers (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  season text not null check (season ~ '^\d{4}-\d{2}$'),
  fee_code text not null,
  billing_month smallint not null default 0 check (billing_month between 0 and 12),
  amount numeric not null check (amount > 0),
  reason text,
  created_by uuid,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint payment_waivers_unique unique (player_id, season, fee_code, billing_month)
);

comment on table public.payment_waivers is
  'Importe pendiente que el club decide no cobrar por jugador, temporada y concepto/mes. No toca payments; reversible borrando la fila.';

create index if not exists payment_waivers_season_idx on public.payment_waivers (season);

alter table public.payment_waivers enable row level security;

-- Sin policies y sin privilegios para los roles de cliente: solo service role (servidor).
revoke all on public.payment_waivers from anon, authenticated;
grant select, insert, update, delete on public.payment_waivers to service_role;
