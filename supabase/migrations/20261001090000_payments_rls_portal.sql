-- payments nunca tuvo grant/RLS para el rol portal (tabla de Team Manager, nunca
-- tocada en ese sentido por este repo — ver 20260925120000_payments_player_id.sql).
-- admin/manager del Portal necesitan leer (listado de matrícula) y anotar pagos
-- (registro rápido) desde /admin/pagos. Additive only: no se toca ningún grant ni
-- policy existente de Team Manager, solo se añaden los necesarios para el Portal.
-- Reusa public.has_portal_role(), ya definida en 20260831120000_portal_access_and_roster.sql.

grant select, insert on public.payments to authenticated;

alter table public.payments enable row level security;

drop policy if exists payments_select_admin_manager on public.payments;
create policy payments_select_admin_manager on public.payments
  for select to authenticated
  using ((select public.has_portal_role(array['admin', 'manager'])));

drop policy if exists payments_insert_admin_manager on public.payments;
create policy payments_insert_admin_manager on public.payments
  for insert to authenticated
  with check ((select public.has_portal_role(array['admin', 'manager'])));

comment on policy payments_select_admin_manager on public.payments is
  'Portal: admin/manager leen pagos (listado de matrícula, /admin/pagos). No afecta a Team Manager.';

comment on policy payments_insert_admin_manager on public.payments is
  'Portal: admin/manager anotan pagos ya recibidos (transferencia/efectivo). No afecta a Team Manager.';

notify pgrst, 'reload schema';
