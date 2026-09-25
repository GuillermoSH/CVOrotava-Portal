-- Historial de estados de pedidos a proveedor (fechas para serigrafía y resto del flujo).

create table if not exists public.clothing_supplier_order_status_events (
  id uuid not null default gen_random_uuid(),
  order_id uuid not null,
  status text not null check (
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
  changed_at timestamptz not null default timezone('utc'::text, now()),
  changed_by uuid,
  constraint clothing_supplier_order_status_events_pkey primary key (id),
  constraint clothing_supplier_order_status_events_order_id_fkey
    foreign key (order_id) references public.clothing_supplier_orders (id) on delete cascade
);

create index if not exists clothing_supplier_order_status_events_order_id_idx
  on public.clothing_supplier_order_status_events (order_id);

create index if not exists clothing_supplier_order_status_events_order_changed_idx
  on public.clothing_supplier_order_status_events (order_id, changed_at desc);

alter table public.clothing_supplier_order_status_events enable row level security;

grant select, insert on table public.clothing_supplier_order_status_events to authenticated;
grant select, insert, delete on table public.clothing_supplier_order_status_events to service_role;

drop policy if exists clothing_supplier_order_status_events_select
  on public.clothing_supplier_order_status_events;
create policy clothing_supplier_order_status_events_select
  on public.clothing_supplier_order_status_events
  for select to authenticated
  using ((select public.has_portal_role(array['admin', 'manager', 'coach'])));

drop policy if exists clothing_supplier_order_status_events_insert
  on public.clothing_supplier_order_status_events;
create policy clothing_supplier_order_status_events_insert
  on public.clothing_supplier_order_status_events
  for insert to authenticated
  with check ((select public.has_portal_role(array['admin', 'manager'])));

-- Backfill: un evento por pedido con el estado actual y updated_at como fecha.
insert into public.clothing_supplier_order_status_events (order_id, status, changed_at, changed_by)
select o.id, o.status, o.updated_at, null
from public.clothing_supplier_orders o
where not exists (
  select 1
  from public.clothing_supplier_order_status_events e
  where e.order_id = o.id
);
