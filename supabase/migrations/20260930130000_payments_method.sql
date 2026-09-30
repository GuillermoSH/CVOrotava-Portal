-- Método de pago anotado manualmente (Portal admin: registro de pagos ya recibidos).
-- Additive only: mismo proyecto Supabase que Team Manager (payments es tabla compartida).
-- Sin CHECK/enum: texto libre para no arriesgar romper TM. Valores usados por el Portal:
-- 'transferencia' | 'efectivo'. Filas históricas o de TM pueden dejarlo null.

alter table public.payments
  add column if not exists method text;

comment on column public.payments.method is
  'Método de pago anotado manualmente por dirección al registrar un cobro ya recibido: ''transferencia'' o ''efectivo''. Texto libre (sin CHECK) por ser tabla compartida con Team Manager; nullable para pagos históricos/de TM sin método anotado.';

notify pgrst, 'reload schema';
