-- Tarifas por temporada y audiencia (base / senior / aficionados).
-- Sustituye a payment_concepts como fuente del formulario de pagos; payment_concepts
-- se deja en base de datos sin uso. Las deudas NO se insertan en payments (tabla
-- compartida con Team Manager): lo pendiente se calcula = tarifa − cobros anotados.

create table if not exists public.season_fee_lines (
  id uuid primary key default gen_random_uuid(),
  season text not null,
  audience text not null check (audience in ('base', 'senior', 'aficionados')),
  code text not null,
  label text not null,
  kind text not null check (kind in ('once', 'monthly')),
  -- null = importe aún sin fijar (p. ej. equipación): no genera deuda.
  amount numeric check (amount is null or amount > 0),
  -- Solo mensualidad de base: importe de players.pays_extended_monthly.
  amount_extended numeric check (amount_extended is null or amount_extended > 0),
  -- Meses naturales (1–12) en que se cobra; vacío para kind = 'once'.
  months smallint[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint season_fee_lines_unique unique (season, audience, code),
  constraint season_fee_lines_months_range
    check (months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]),
  constraint season_fee_lines_kind_months check (
    (kind = 'once' and cardinality(months) = 0)
    or (kind = 'monthly' and cardinality(months) > 0)
  )
);

comment on table public.season_fee_lines is
  'Líneas de tarifa por temporada y audiencia. Importe nullable hasta que dirección lo guarde.';

alter table public.season_fee_lines enable row level security;

drop policy if exists season_fee_lines_select_admin_manager on public.season_fee_lines;
create policy season_fee_lines_select_admin_manager on public.season_fee_lines
  for select to authenticated
  using ((select public.has_portal_role(array['admin', 'manager'])));

drop policy if exists season_fee_lines_insert_admin_manager on public.season_fee_lines;
create policy season_fee_lines_insert_admin_manager on public.season_fee_lines
  for insert to authenticated
  with check ((select public.has_portal_role(array['admin', 'manager'])));

drop policy if exists season_fee_lines_update_admin_manager on public.season_fee_lines;
create policy season_fee_lines_update_admin_manager on public.season_fee_lines
  for update to authenticated
  using ((select public.has_portal_role(array['admin', 'manager'])))
  with check ((select public.has_portal_role(array['admin', 'manager'])));

drop policy if exists season_fee_lines_delete_admin_manager on public.season_fee_lines;
create policy season_fee_lines_delete_admin_manager on public.season_fee_lines
  for delete to authenticated
  using ((select public.has_portal_role(array['admin', 'manager'])));

-- Sin GRANT la policy no basta ("permission denied for table"): ver payment_concepts_grants.
grant select, insert, update, delete on public.season_fee_lines to authenticated;

-- Siembra de la temporada actual (2026-27). Importe de equipación sin fijar.
insert into public.season_fee_lines
  (season, audience, code, label, kind, amount, amount_extended, months, sort_order)
select * from (values
  ('2026-27', 'base',        'matricula',   'Matrícula',     'once',    75::numeric, null::numeric, '{}'::smallint[], 1),
  ('2026-27', 'base',        'equipacion',  'Equipación',    'once',    null,        null,          '{}'::smallint[], 2),
  ('2026-27', 'base',        'mensualidad', 'Cuota mensual', 'monthly', 25,          30,            '{10,11,12,1,2,3,4,5,6}'::smallint[], 3),
  ('2026-27', 'senior',      'matricula',   'Matrícula',     'once',    75,          null,          '{}'::smallint[], 1),
  ('2026-27', 'senior',      'pago_unico',  'Pago único',    'once',    90,          null,          '{}'::smallint[], 2),
  ('2026-27', 'senior',      'mensualidad', 'Cuota mensual', 'monthly', 25,          null,          '{1,2,3}'::smallint[], 3),
  ('2026-27', 'aficionados', 'matricula',   'Matrícula',     'once',    75,          null,          '{}'::smallint[], 1),
  ('2026-27', 'aficionados', 'pago_unico',  'Pago único',    'once',    90,          null,          '{}'::smallint[], 2)
) as seed(season, audience, code, label, kind, amount, amount_extended, months, sort_order)
where not exists (select 1 from public.season_fee_lines where season = '2026-27');

-- Columnas aditivas en payments (tabla compartida con Team Manager: nullable, sin
-- tocar lecturas ajenas; el texto `concept` se sigue escribiendo igual).
alter table public.payments
  add column if not exists fee_code text,
  add column if not exists billing_month smallint;

alter table public.payments
  drop constraint if exists payments_billing_month_range;
alter table public.payments
  add constraint payments_billing_month_range
  check (billing_month is null or billing_month between 1 and 12);

comment on column public.payments.fee_code is
  'Línea de tarifa que cierra este cobro (matricula, equipacion, pago_unico, mensualidad…). Null = cobro libre.';
comment on column public.payments.billing_month is
  'Mes natural (1–12) que cubre una mensualidad. Null en cobros únicos y en cuotas antiguas sin mes.';

-- Backfill por texto del concepto. Una "Cuota mensual" antigua no se adivina: queda sin mes.
update public.payments
set fee_code = 'matricula'
where fee_code is null and concept ilike 'matr_cula%';

update public.payments
set fee_code = 'pago_unico'
where fee_code is null and concept ilike 'pago _nico%';

create index if not exists payments_player_season_idx
  on public.payments (player_id, season);

notify pgrst, 'reload schema';
