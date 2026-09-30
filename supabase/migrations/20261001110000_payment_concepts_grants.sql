-- Falta el GRANT de tabla en la migración anterior (20261001100000): en este
-- proyecto Supabase crear una tabla nueva no concede privilegios por defecto a
-- `authenticated` (igual que nos pasó con payments en 20261001090000) — RLS por
-- sí sola no basta sin el GRANT, de ahí el "permission denied for table
-- payment_concepts" aunque las policies ya existieran.

grant select, insert, update on public.payment_concepts to authenticated;

notify pgrst, 'reload schema';
