-- Checklist de alta: docs club→familia (con fecha), foto, y columnas booleanas filtrables.
-- Prerequisite: 20260907140000_player_profile_and_contacts.sql

alter table public.players
  add column if not exists docs_delivered_to_family boolean not null default false,
  add column if not exists docs_delivered_at timestamptz,
  add column if not exists photo_taken boolean not null default false;

comment on column public.players.docs_delivered_to_family is
  'Documentación del club entregada a la familia';
comment on column public.players.docs_delivered_at is
  'Fecha/hora en que se marcaron docs entregados; null si no entregados';
comment on column public.players.photo_taken is
  'Foto de ficha / licencia hecha';

notify pgrst, 'reload schema';
