-- Índice para las lecturas de /admin/pagos y del listado de jugadores:
--   · cobros pagados de la temporada (status = 'paid', season = X)
--   · matrícula pagada (fee_code = 'matricula')
-- payments es compartida con Team Manager: solo se añade un índice, no se toca nada más.

create index if not exists payments_season_status_fee_idx
  on public.payments (season, status, fee_code);

notify pgrst, 'reload schema';
