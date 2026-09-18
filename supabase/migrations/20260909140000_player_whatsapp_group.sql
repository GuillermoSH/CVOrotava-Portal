-- Tracking: jugador ya incluido en el grupo de WhatsApp de su categoría.
-- Prerequisite: 20260909120000_player_onboarding_checklist.sql

alter table public.players
  add column if not exists in_whatsapp_group boolean not null default false;

comment on column public.players.in_whatsapp_group is
  'Incluido en el grupo de WhatsApp de la categoría / equipo';

notify pgrst, 'reload schema';
