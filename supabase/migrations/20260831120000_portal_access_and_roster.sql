-- Portal access + roster foundation.
-- Additive only: no existing table (users, allowed_emails, payments, matches, ...)
-- is altered or dropped. Safe to run against the shared CVOrotava-Team-Manager project.
--
-- Adds:
--   1. user_app_roles   — per-app authorization (Team-Manager and Portal read independently)
--   2. teams            — club-wide category/roster grouping
--   3. players           — club roster hub (seniors with login + base categories without)
--   4. player_guardians — tutor <-> player links (N:M, supports two guardians per minor)
--
-- Deliberately out of scope: payments.player_id, clothing_items, clothing_reservations.

-- =========================================================
-- 1. user_app_roles
-- =========================================================
create table public.user_app_roles (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  app text not null check (app = any (array['team_manager'::text, 'portal'::text])),
  role text not null check (role = any (array['admin'::text, 'manager'::text, 'coach'::text, 'parent'::text])),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint user_app_roles_pkey primary key (id),
  constraint user_app_roles_user_id_fkey foreign key (user_id) references public.users(id),
  constraint user_app_roles_unique unique (user_id, app, role)
);

alter table public.user_app_roles enable row level security;

-- =========================================================
-- 2. teams
-- =========================================================
create table public.teams (
  id uuid not null default gen_random_uuid(),
  name text not null,
  category text not null,
  gender text not null check (gender = any (array['male'::text, 'female'::text])),
  season text not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint teams_pkey primary key (id)
);

alter table public.teams enable row level security;

-- =========================================================
-- 3. players
-- =========================================================
create table public.players (
  id uuid not null default gen_random_uuid(),
  full_name text not null,
  birth_date date,
  team_id uuid,
  user_id uuid,
  season text not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint players_pkey primary key (id),
  constraint players_team_id_fkey foreign key (team_id) references public.teams(id),
  constraint players_user_id_fkey foreign key (user_id) references public.users(id)
);

create index players_team_id_idx on public.players (team_id);
create index players_user_id_idx on public.players (user_id);
-- a login-bearing account maps to at most one roster row
create unique index players_user_id_unique_idx on public.players (user_id) where user_id is not null;

alter table public.players enable row level security;

-- =========================================================
-- 4. player_guardians
-- =========================================================
create table public.player_guardians (
  id uuid not null default gen_random_uuid(),
  player_id uuid not null,
  guardian_user_id uuid not null,
  relationship text,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint player_guardians_pkey primary key (id),
  constraint player_guardians_player_id_fkey foreign key (player_id) references public.players(id),
  constraint player_guardians_guardian_user_id_fkey foreign key (guardian_user_id) references public.users(id),
  constraint player_guardians_unique unique (player_id, guardian_user_id)
);

create index player_guardians_guardian_user_id_idx on public.player_guardians (guardian_user_id);

alter table public.player_guardians enable row level security;

-- =========================================================
-- Helper functions (security definer: bypass RLS internally so they
-- can be reused inside policies, including on user_app_roles itself,
-- without recursive policy evaluation).
-- =========================================================

create or replace function public.has_portal_role(required_roles text[])
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_app_roles
    where user_id = (select auth.uid())
      and app = 'portal'
      and role = any (required_roles)
  );
$$;

create or replace function public.is_guardian_of(target_player_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.player_guardians
    where player_id = target_player_id
      and guardian_user_id = (select auth.uid())
  );
$$;

-- =========================================================
-- Policies
-- =========================================================

-- user_app_roles: everyone reads their own rows; admin reads/writes everything.
create policy user_app_roles_select_self on public.user_app_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_portal_role(array['admin'])));

create policy user_app_roles_write_admin on public.user_app_roles
  for insert to authenticated
  with check ((select public.has_portal_role(array['admin'])));

create policy user_app_roles_update_admin on public.user_app_roles
  for update to authenticated
  using ((select public.has_portal_role(array['admin'])))
  with check ((select public.has_portal_role(array['admin'])));

create policy user_app_roles_delete_admin on public.user_app_roles
  for delete to authenticated
  using ((select public.has_portal_role(array['admin'])));

-- teams: any portal role can read; only admin/manager write.
create policy teams_select_portal on public.teams
  for select to authenticated
  using ((select public.has_portal_role(array['admin', 'manager', 'coach', 'parent'])));

create policy teams_write_admin_manager on public.teams
  for insert to authenticated
  with check ((select public.has_portal_role(array['admin', 'manager'])));

create policy teams_update_admin_manager on public.teams
  for update to authenticated
  using ((select public.has_portal_role(array['admin', 'manager'])))
  with check ((select public.has_portal_role(array['admin', 'manager'])));

create policy teams_delete_admin_manager on public.teams
  for delete to authenticated
  using ((select public.has_portal_role(array['admin', 'manager'])));

-- players: admin/manager/coach see the whole roster; a guardian sees only
-- their linked players; a senior with login sees only their own row.
create policy players_select_scoped on public.players
  for select to authenticated
  using (
    (select public.has_portal_role(array['admin', 'manager', 'coach']))
    or (select public.is_guardian_of(id))
    or user_id = (select auth.uid())
  );

create policy players_write_admin_manager on public.players
  for insert to authenticated
  with check ((select public.has_portal_role(array['admin', 'manager'])));

create policy players_update_admin_manager on public.players
  for update to authenticated
  using ((select public.has_portal_role(array['admin', 'manager'])))
  with check ((select public.has_portal_role(array['admin', 'manager'])));

create policy players_delete_admin_manager on public.players
  for delete to authenticated
  using ((select public.has_portal_role(array['admin', 'manager'])));

-- player_guardians: admin reads/writes everything; a guardian reads their own links.
create policy player_guardians_select on public.player_guardians
  for select to authenticated
  using (
    (select public.has_portal_role(array['admin']))
    or guardian_user_id = (select auth.uid())
  );

create policy player_guardians_write_admin on public.player_guardians
  for insert to authenticated
  with check ((select public.has_portal_role(array['admin'])));

create policy player_guardians_update_admin on public.player_guardians
  for update to authenticated
  using ((select public.has_portal_role(array['admin'])))
  with check ((select public.has_portal_role(array['admin'])));

create policy player_guardians_delete_admin on public.player_guardians
  for delete to authenticated
  using ((select public.has_portal_role(array['admin'])));
