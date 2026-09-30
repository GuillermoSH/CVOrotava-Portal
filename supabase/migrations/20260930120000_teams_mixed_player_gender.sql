-- Equipos mixtos (aficionados) + sexo en jugador.
-- teams.gender: male | female | mixed
-- players.gender: male | female (nullable; obligatorio en UI si el equipo es mixto)

alter table public.teams
  drop constraint if exists teams_gender_check;

alter table public.teams
  add constraint teams_gender_check
  check (gender = any (array['male'::text, 'female'::text, 'mixed'::text]));

alter table public.players
  add column if not exists gender text;

alter table public.players
  drop constraint if exists players_gender_chk;

alter table public.players
  add constraint players_gender_chk
  check (gender is null or gender = any (array['male'::text, 'female'::text]));

comment on column public.players.gender is
  'Sexo del jugador (male|female). En equipos mixtos se guarda aquí; en mono-género puede heredarse del equipo.';
