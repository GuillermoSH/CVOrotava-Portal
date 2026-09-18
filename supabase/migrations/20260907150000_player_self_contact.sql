-- Allow storing the player's own contact when they are of legal age.

alter table public.player_contacts
  drop constraint if exists player_contacts_relationship_chk;

alter table public.player_contacts
  add constraint player_contacts_relationship_chk
  check (
    relationship = any (
      array['madre'::text, 'padre'::text, 'tutor'::text, 'otro'::text, 'jugador'::text]
    )
  );

notify pgrst, 'reload schema';
