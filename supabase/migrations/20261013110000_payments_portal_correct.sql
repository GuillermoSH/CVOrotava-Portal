-- Corregir / anular cobros anotados desde el Portal (matriz de /admin/pagos).
-- payments es tabla compartida con Team Manager: solo se permite modificar filas
-- que el Portal anotó (method no es null) y solo las columnas que el Portal edita.
-- Additive only: no toca grants ni policies existentes de Team Manager.

grant update (method, amount, paid_date, notes, updated_at) on public.payments to authenticated;
grant delete on public.payments to authenticated;

drop policy if exists payments_update_portal_annotated on public.payments;
create policy payments_update_portal_annotated on public.payments
  for update to authenticated
  using (
    method is not null
    and (select public.has_portal_role(array['admin', 'manager']))
  )
  with check (
    method is not null
    and (select public.has_portal_role(array['admin', 'manager']))
  );

drop policy if exists payments_delete_portal_annotated on public.payments;
create policy payments_delete_portal_annotated on public.payments
  for delete to authenticated
  using (
    method is not null
    and (select public.has_portal_role(array['admin', 'manager']))
  );

comment on policy payments_update_portal_annotated on public.payments is
  'Portal: admin/manager corrigen método/importe de cobros que anotó el Portal (method no nulo).';

comment on policy payments_delete_portal_annotated on public.payments is
  'Portal: admin/manager anulan cobros anotados desde el Portal (method no nulo). No afecta a filas de Team Manager.';

notify pgrst, 'reload schema';
