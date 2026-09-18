-- Consentimiento de imagen (uso de fotos del jugador: redes, cartel, material del club).
-- Prerequisite: 20260909140000_player_whatsapp_group.sql

alter table public.players
  add column if not exists photo_consent boolean not null default false;

comment on column public.players.photo_consent is
  'Autoriza sacarse / usar fotos (redes, cartel, material del club)';

notify pgrst, 'reload schema';
