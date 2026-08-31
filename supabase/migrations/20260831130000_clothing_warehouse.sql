-- Clothing warehouse + supplier orders (Portal admin v1).
-- Additive only. Uses has_portal_role from portal_access migration.
-- Safe to re-run: skips objects that already exist (partial apply recovery).

-- =========================================================
-- 0. clothing_size enum (Hummel adult + youth + one size)
-- =========================================================
do $$
begin
  create type public.clothing_size as enum (
    'xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', '3xl', '4xl', '5xl',
    '104', '110', '116', '122', '128', '134', '140', '146', '152', '164', '176',
    'one_size'
  );
exception
  when duplicate_object then null;
end $$;

-- =========================================================
-- 1. clothing_products
-- =========================================================
create table if not exists public.clothing_products (
  id uuid not null default gen_random_uuid(),
  name text not null,
  category text not null check (
    category = any (array['backpack'::text, 'shirt'::text, 'pants'::text, 'jacket'::text, 'other'::text])
  ),
  season text not null,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint clothing_products_pkey primary key (id)
);

create index if not exists clothing_products_season_idx on public.clothing_products (season);

alter table public.clothing_products enable row level security;

-- =========================================================
-- 2. clothing_supplier_orders
-- =========================================================
create table if not exists public.clothing_supplier_orders (
  id uuid not null default gen_random_uuid(),
  reference text not null,
  supplier_name text not null,
  season text not null,
  status text not null default 'draft' check (
    status = any (
      array[
        'draft'::text,
        'ordered'::text,
        'received'::text,
        'at_serigraphy'::text,
        'returned_from_serigraphy'::text,
        'closed'::text
      ]
    )
  ),
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint clothing_supplier_orders_pkey primary key (id),
  constraint clothing_supplier_orders_reference_unique unique (reference)
);

create index if not exists clothing_supplier_orders_status_idx on public.clothing_supplier_orders (status);
create index if not exists clothing_supplier_orders_season_idx on public.clothing_supplier_orders (season);

alter table public.clothing_supplier_orders enable row level security;

-- =========================================================
-- 3. clothing_supplier_order_lines
-- =========================================================
create table if not exists public.clothing_supplier_order_lines (
  id uuid not null default gen_random_uuid(),
  order_id uuid not null,
  product_id uuid not null,
  size public.clothing_size not null,
  quantity_ordered integer not null check (quantity_ordered > 0),
  quantity_received integer not null default 0 check (quantity_received >= 0),
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint clothing_supplier_order_lines_pkey primary key (id),
  constraint clothing_supplier_order_lines_order_id_fkey
    foreign key (order_id) references public.clothing_supplier_orders (id) on delete cascade,
  constraint clothing_supplier_order_lines_product_id_fkey
    foreign key (product_id) references public.clothing_products (id)
);

create index if not exists clothing_supplier_order_lines_order_id_idx
  on public.clothing_supplier_order_lines (order_id);

alter table public.clothing_supplier_order_lines enable row level security;

-- =========================================================
-- 4. clothing_storage_locations (hierarchical)
-- =========================================================
create table if not exists public.clothing_storage_locations (
  id uuid not null default gen_random_uuid(),
  parent_id uuid,
  location_type text not null check (
    location_type = any (array['cabinet'::text, 'shelf'::text, 'box'::text])
  ),
  label text not null,
  code text not null,
  season text not null,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint clothing_storage_locations_pkey primary key (id),
  constraint clothing_storage_locations_parent_id_fkey
    foreign key (parent_id) references public.clothing_storage_locations (id) on delete cascade,
  constraint clothing_storage_locations_code_season_unique unique (code, season)
);

create index if not exists clothing_storage_locations_parent_id_idx
  on public.clothing_storage_locations (parent_id);

alter table public.clothing_storage_locations enable row level security;

-- =========================================================
-- 5. clothing_inventory_lots
-- =========================================================
create table if not exists public.clothing_inventory_lots (
  id uuid not null default gen_random_uuid(),
  product_id uuid not null,
  size public.clothing_size not null,
  quantity integer not null check (quantity > 0),
  status text not null default 'pending_storage' check (
    status = any (array['pending_storage'::text, 'stored'::text])
  ),
  storage_location_id uuid,
  source_order_id uuid,
  source_line_id uuid,
  returned_from_serigraphy_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint clothing_inventory_lots_pkey primary key (id),
  constraint clothing_inventory_lots_product_id_fkey
    foreign key (product_id) references public.clothing_products (id),
  constraint clothing_inventory_lots_storage_location_id_fkey
    foreign key (storage_location_id) references public.clothing_storage_locations (id),
  constraint clothing_inventory_lots_source_order_id_fkey
    foreign key (source_order_id) references public.clothing_supplier_orders (id),
  constraint clothing_inventory_lots_source_line_id_fkey
    foreign key (source_line_id) references public.clothing_supplier_order_lines (id)
);

create index if not exists clothing_inventory_lots_status_idx on public.clothing_inventory_lots (status);
create index if not exists clothing_inventory_lots_product_id_idx on public.clothing_inventory_lots (product_id);

alter table public.clothing_inventory_lots enable row level security;

-- PostgREST: RLS policies require underlying table grants for `authenticated`.
do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'clothing_size'
      and n.nspname = 'public'
  ) then
    grant usage on type public.clothing_size to authenticated;
  end if;
end $$;

grant select, insert, update, delete on table public.clothing_products to authenticated;
grant select, insert, update, delete on table public.clothing_supplier_orders to authenticated;
grant select, insert, update, delete on table public.clothing_supplier_order_lines to authenticated;
grant select, insert, update, delete on table public.clothing_storage_locations to authenticated;
grant select, insert, update, delete on table public.clothing_inventory_lots to authenticated;

-- =========================================================
-- RLS: admin/manager write; coach read-only
-- =========================================================
drop policy if exists clothing_products_select on public.clothing_products;
create policy clothing_products_select on public.clothing_products
  for select to authenticated
  using ((select public.has_portal_role(array['admin', 'manager', 'coach'])));

drop policy if exists clothing_products_write on public.clothing_products;
create policy clothing_products_write on public.clothing_products
  for all to authenticated
  using ((select public.has_portal_role(array['admin', 'manager'])))
  with check ((select public.has_portal_role(array['admin', 'manager'])));

drop policy if exists clothing_supplier_orders_select on public.clothing_supplier_orders;
create policy clothing_supplier_orders_select on public.clothing_supplier_orders
  for select to authenticated
  using ((select public.has_portal_role(array['admin', 'manager', 'coach'])));

drop policy if exists clothing_supplier_orders_write on public.clothing_supplier_orders;
create policy clothing_supplier_orders_write on public.clothing_supplier_orders
  for all to authenticated
  using ((select public.has_portal_role(array['admin', 'manager'])))
  with check ((select public.has_portal_role(array['admin', 'manager'])));

drop policy if exists clothing_supplier_order_lines_select on public.clothing_supplier_order_lines;
create policy clothing_supplier_order_lines_select on public.clothing_supplier_order_lines
  for select to authenticated
  using ((select public.has_portal_role(array['admin', 'manager', 'coach'])));

drop policy if exists clothing_supplier_order_lines_write on public.clothing_supplier_order_lines;
create policy clothing_supplier_order_lines_write on public.clothing_supplier_order_lines
  for all to authenticated
  using ((select public.has_portal_role(array['admin', 'manager'])))
  with check ((select public.has_portal_role(array['admin', 'manager'])));

drop policy if exists clothing_storage_locations_select on public.clothing_storage_locations;
create policy clothing_storage_locations_select on public.clothing_storage_locations
  for select to authenticated
  using ((select public.has_portal_role(array['admin', 'manager', 'coach'])));

drop policy if exists clothing_storage_locations_write on public.clothing_storage_locations;
create policy clothing_storage_locations_write on public.clothing_storage_locations
  for all to authenticated
  using ((select public.has_portal_role(array['admin', 'manager'])))
  with check ((select public.has_portal_role(array['admin', 'manager'])));

drop policy if exists clothing_inventory_lots_select on public.clothing_inventory_lots;
create policy clothing_inventory_lots_select on public.clothing_inventory_lots
  for select to authenticated
  using ((select public.has_portal_role(array['admin', 'manager', 'coach'])));

drop policy if exists clothing_inventory_lots_write on public.clothing_inventory_lots;
create policy clothing_inventory_lots_write on public.clothing_inventory_lots
  for all to authenticated
  using ((select public.has_portal_role(array['admin', 'manager'])))
  with check ((select public.has_portal_role(array['admin', 'manager'])));
