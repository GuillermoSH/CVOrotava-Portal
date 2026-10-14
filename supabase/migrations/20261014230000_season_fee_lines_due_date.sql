-- Fecha límite de cada línea de tarifa (pagos únicos).
-- Null = sin fecha (sigue contando como vencido desde el alta, como hasta ahora).
-- Tras la fecha, si queda importe pendiente → atrasado.

alter table public.season_fee_lines
  add column if not exists due_date date;

comment on column public.season_fee_lines.due_date is
  'Fecha límite del concepto (pagos únicos). Null = sin plazo; el portal lo trata como ya vencido.';

notify pgrst, 'reload schema';
