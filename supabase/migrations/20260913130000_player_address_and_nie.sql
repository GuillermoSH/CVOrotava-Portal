-- Dirección por campos (vía, número, puerta, municipio, provincia…)
-- y datos de NIE (país de nacimiento, nacionalidad si no es española).
-- Prerequisite: 20260913120000_player_photo_consent.sql

alter table public.players
  add column if not exists address_street_type text,
  add column if not exists address_street text,
  add column if not exists address_number text,
  add column if not exists address_door text,
  add column if not exists address_postal_code text,
  add column if not exists address_municipality text,
  add column if not exists address_province text,
  add column if not exists birth_country text,
  add column if not exists nationality text;

alter table public.players
  drop constraint if exists players_address_street_type_chk;

alter table public.players
  add constraint players_address_street_type_chk
  check (
    address_street_type is null
    or address_street_type = any (array[
      'calle'::text,
      'avenida'::text,
      'carretera'::text,
      'plaza'::text,
      'paseo'::text,
      'camino'::text,
      'urbanizacion'::text,
      'otro'::text
    ])
  );

comment on column public.players.address is
  'Dirección en una línea (se rellena al guardar a partir de los campos)';
comment on column public.players.address_street_type is
  'Tipo de vía: calle, avenida, carretera, plaza, paseo, camino, urbanización u otro';
comment on column public.players.address_street is
  'Nombre de la vía';
comment on column public.players.address_number is
  'Número de portal (o s/n)';
comment on column public.players.address_door is
  'Piso / puerta';
comment on column public.players.address_postal_code is
  'Código postal';
comment on column public.players.address_municipality is
  'Municipio';
comment on column public.players.address_province is
  'Provincia';
comment on column public.players.birth_country is
  'País de nacimiento (ficha federativa; habitual en NIE)';
comment on column public.players.nationality is
  'Nacionalidad si no es española (habitual en NIE)';

notify pgrst, 'reload schema';
