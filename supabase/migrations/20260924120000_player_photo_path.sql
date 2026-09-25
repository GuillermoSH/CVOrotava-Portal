-- Foto de ficha (uso interno / federativa) en Storage privado.
-- Distinto de photo_consent (autorización para redes, cartel, material).
-- Prerequisite: 20260913120000_player_photo_consent.sql

alter table public.players
  add column if not exists photo_path text;

comment on column public.players.photo_path is
  'Path del objeto en el bucket player-photos ({player_id}/avatar.webp). Uso interno / ficha federativa; no confundir con photo_consent.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'player-photos',
  'player-photos',
  false,
  204800,
  array['image/webp', 'image/jpeg']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';
