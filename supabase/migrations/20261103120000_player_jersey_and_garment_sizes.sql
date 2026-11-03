-- Dorsal del jugador y tarjeta de tallaje por prenda.
-- Additive only: columna nueva en players (compartida con Team Manager, que no la lee) y tabla
-- propia del Portal. players.clothing_size se conserva como talla general de respaldo.

-- ---------------------------------------------------------------------------
-- 1. Dorsal (los jugadores son una fila por temporada: el dorsal es el de esa temporada)
-- ---------------------------------------------------------------------------
alter table public.players
  add column if not exists jersey_number smallint;

alter table public.players
  drop constraint if exists players_jersey_number_chk;

alter table public.players
  add constraint players_jersey_number_chk
  check (jersey_number is null or (jersey_number >= 0 and jersey_number <= 99));

comment on column public.players.jersey_number is
  'Dorsal del jugador en esa temporada (0-99). Sin unicidad: dos jugadores de un mismo equipo pueden compartirlo y la app avisa.';

-- ---------------------------------------------------------------------------
-- 2. Talla por prenda
-- ---------------------------------------------------------------------------
create table if not exists public.player_clothing_sizes (
  player_id uuid not null references public.players (id) on delete cascade,
  -- Misma clave que lib/clothing/constants.ts (CLOTHING_CATEGORIES), sin la mochila.
  category text not null check (
    category in (
      'shirt_warmup', 'shirt_competition', 'jacket', 'pants_short',
      'shorts', 'sweatshirt', 'pants_long', 'socks'
    )
  ),
  size public.clothing_size not null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (player_id, category)
);

comment on table public.player_clothing_sizes is
  'Talla de cada prenda de un jugador (hay quien usa L en la camiseta y M en la sudadera).';

alter table public.player_clothing_sizes enable row level security;

-- Lectura: admin, manager y entrenador (ven toda la plantilla), el tutor de ese jugador
-- y el propio jugador con cuenta. Escritura: admin y manager.
drop policy if exists player_clothing_sizes_select on public.player_clothing_sizes;
create policy player_clothing_sizes_select on public.player_clothing_sizes
  for select to authenticated
  using (
    (select public.has_portal_role(array['admin', 'manager', 'coach']))
    or (select public.is_guardian_of(player_id))
    or exists (
      select 1 from public.players p
      where p.id = player_clothing_sizes.player_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists player_clothing_sizes_write on public.player_clothing_sizes;
create policy player_clothing_sizes_write on public.player_clothing_sizes
  for all to authenticated
  using ((select public.has_portal_role(array['admin', 'manager'])))
  with check ((select public.has_portal_role(array['admin', 'manager'])));

-- Sin GRANT la policy no basta ("permission denied for table").
grant select, insert, update, delete on public.player_clothing_sizes to authenticated;
grant select, insert, update, delete on public.player_clothing_sizes to service_role;

notify pgrst, 'reload schema';
