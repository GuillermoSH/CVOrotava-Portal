-- Re-backfill payments.player_id from linked roster (players.user_id).
-- Safe to re-run: only fills null player_id.
-- Users without a players row (bajas / no siguen) keep payments.user_id only
-- so Team Manager can still show their history without creating a ficha.

update public.payments p
set player_id = pl.id
from public.players pl
where p.player_id is null
  and p.user_id is not null
  and pl.user_id is not null
  and pl.user_id = p.user_id;

comment on column public.payments.player_id is
  'Sujeto del pago (perfil roster). Pagos históricos de usuarios sin ficha quedan solo con user_id.';
