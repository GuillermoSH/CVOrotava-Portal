-- Catálogo de conceptos de pago predefinidos (cuota, matrícula, pago único...)
-- para agilizar el registro de pagos desde /admin/pagos. Tabla nueva, propia del
-- Portal (no compartida con Team Manager) — sí se puede usar CHECK/RLS completos.
--
-- is_matricula marca qué concepto(s) cuentan para "matrícula pendiente" en el
-- listado de jugadores, en vez de comparar por texto fijo (así renombrar el
-- concepto desde la mini-UI de gestión no rompe esa lógica).

create table if not exists public.payment_concepts (
  id uuid primary key default gen_random_uuid(),
  concept text not null,
  amount numeric not null check (amount > 0),
  is_matricula boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

comment on column public.payment_concepts.is_matricula is
  'Si true, los pagos con este concept cuentan para "matrícula pagada" en /admin/pagos.';

alter table public.payment_concepts enable row level security;

drop policy if exists payment_concepts_select_admin_manager on public.payment_concepts;
create policy payment_concepts_select_admin_manager on public.payment_concepts
  for select to authenticated
  using ((select public.has_portal_role(array['admin', 'manager'])));

drop policy if exists payment_concepts_insert_admin_manager on public.payment_concepts;
create policy payment_concepts_insert_admin_manager on public.payment_concepts
  for insert to authenticated
  with check ((select public.has_portal_role(array['admin', 'manager'])));

drop policy if exists payment_concepts_update_admin_manager on public.payment_concepts;
create policy payment_concepts_update_admin_manager on public.payment_concepts
  for update to authenticated
  using ((select public.has_portal_role(array['admin', 'manager'])))
  with check ((select public.has_portal_role(array['admin', 'manager'])));

insert into public.payment_concepts (concept, amount, is_matricula, sort_order)
select * from (values
  ('Cuota mensual', 25, false, 1),
  ('Cuota mensual', 30, false, 2),
  ('Matrícula', 75, true, 3),
  ('Pago único', 90, false, 4)
) as seed(concept, amount, is_matricula, sort_order)
where not exists (select 1 from public.payment_concepts);

notify pgrst, 'reload schema';
