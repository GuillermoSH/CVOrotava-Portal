-- Ficha de jugador: datos administrativos, talla, dirección y contactos de tutores
-- (sin exigir cuenta de portal). Prerequisite: 20260831120000_portal_access_and_roster.sql
-- clothing_size: 20260831130000_clothing_warehouse.sql

alter table public.players
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists dni text,
  add column if not exists license_completed boolean not null default false,
  add column if not exists registration_papers_received boolean not null default false,
  add column if not exists medical_notes text,
  add column if not exists clothing_size public.clothing_size,
  add column if not exists address text,
  add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

update public.players
set
  first_name = coalesce(nullif(btrim(split_part(full_name, ' ', 1)), ''), full_name),
  last_name = coalesce(
    nullif(btrim(substring(full_name from length(split_part(full_name, ' ', 1)) + 1)), ''),
    full_name
  )
where first_name is null or last_name is null;

alter table public.players
  alter column first_name set not null,
  alter column last_name set not null;

create unique index if not exists players_dni_season_unique_idx
  on public.players (season, lower(btrim(dni)))
  where dni is not null and btrim(dni) <> '';

create or replace function public.players_sync_full_name()
returns trigger
language plpgsql
as $$
begin
  new.full_name := btrim(concat_ws(' ', new.first_name, new.last_name));
  new.updated_at := timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists players_sync_full_name_trg on public.players;
create trigger players_sync_full_name_trg
  before insert or update
  on public.players
  for each row
  execute procedure public.players_sync_full_name();

create table if not exists public.player_contacts (
  id uuid not null default gen_random_uuid(),
  player_id uuid not null,
  full_name text not null,
  relationship text not null default 'tutor',
  phone text,
  email text,
  is_primary boolean not null default false,
  portal_user_id uuid,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint player_contacts_pkey primary key (id),
  constraint player_contacts_player_id_fkey
    foreign key (player_id) references public.players (id) on delete cascade,
  constraint player_contacts_portal_user_id_fkey
    foreign key (portal_user_id) references public.users (id) on delete set null,
  constraint player_contacts_relationship_chk
    check (relationship = any (array['madre'::text, 'padre'::text, 'tutor'::text, 'otro'::text, 'jugador'::text]))
);

create index if not exists player_contacts_player_id_idx
  on public.player_contacts (player_id);

create unique index if not exists player_contacts_primary_idx
  on public.player_contacts (player_id)
  where is_primary;

alter table public.player_contacts enable row level security;

grant select, insert, update, delete on table public.player_contacts to authenticated;
grant select, insert, update, delete on table public.player_contacts to service_role;

drop policy if exists player_contacts_select on public.player_contacts;
create policy player_contacts_select on public.player_contacts
  for select to authenticated
  using (
    (select public.has_portal_role(array['admin', 'manager', 'coach']))
    or exists (
      select 1
      from public.players p
      where p.id = player_id
        and (
          (select public.is_guardian_of(p.id))
          or p.user_id = (select auth.uid())
        )
    )
  );

drop policy if exists player_contacts_write on public.player_contacts;
create policy player_contacts_write on public.player_contacts
  for insert to authenticated
  with check ((select public.has_portal_role(array['admin', 'manager'])));

drop policy if exists player_contacts_update on public.player_contacts;
create policy player_contacts_update on public.player_contacts
  for update to authenticated
  using ((select public.has_portal_role(array['admin', 'manager'])))
  with check ((select public.has_portal_role(array['admin', 'manager'])));

drop policy if exists player_contacts_delete on public.player_contacts;
create policy player_contacts_delete on public.player_contacts
  for delete to authenticated
  using ((select public.has_portal_role(array['admin', 'manager'])));

notify pgrst, 'reload schema';
