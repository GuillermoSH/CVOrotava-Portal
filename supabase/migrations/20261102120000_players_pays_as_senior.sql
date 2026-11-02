-- Jugadores de categorías base que pagan la tarifa de sénior (entrenan siempre con séniors).
-- Additive only: columna con default false en players (tabla compartida con Team Manager,
-- que no la lee). No toca payments: lo ya cobrado (p. ej. la matrícula) sigue contando,
-- porque los cobros se casan por fee_code y no por colectivo.

alter table public.players
  add column if not exists pays_as_senior boolean not null default false;

comment on column public.players.pays_as_senior is
  'Categoría base que paga como sénior: sus cuotas salen de la tarifa senior de la temporada.';

notify pgrst, 'reload schema';
