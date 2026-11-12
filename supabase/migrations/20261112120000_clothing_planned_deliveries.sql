-- Entregas previstas: al registrar un pedido a proveedor se asigna cada prenda (producto + talla,
-- y dorsal si lleva) a un jugador. Al entregar, el formulario ofrece lo previsto que ya está en
-- stock y lo marca como entregado.
--
-- Solo aditiva: no toca pedidos, líneas, lotes ni movimientos. Una fila = una unidad prevista.
-- No referencia la línea del pedido (se borran y recrean al editar un borrador): la previsión
-- se identifica por pedido + producto + talla.

create table if not exists public.clothing_planned_deliveries (
  id uuid not null default gen_random_uuid(),
  order_id uuid not null,
  player_id uuid not null,
  product_id uuid not null,
  size public.clothing_size not null,
  jersey_number smallint,
  delivered_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint clothing_planned_deliveries_pkey primary key (id),
  constraint clothing_planned_deliveries_order_id_fkey
    foreign key (order_id) references public.clothing_supplier_orders (id) on delete cascade,
  constraint clothing_planned_deliveries_player_id_fkey
    foreign key (player_id) references public.players (id) on delete cascade,
  constraint clothing_planned_deliveries_product_id_fkey
    foreign key (product_id) references public.clothing_products (id),
  constraint clothing_planned_deliveries_jersey_number_chk
    check (jersey_number is null or (jersey_number >= 0 and jersey_number <= 99))
);

create index if not exists clothing_planned_deliveries_order_id_idx
  on public.clothing_planned_deliveries (order_id);

create index if not exists clothing_planned_deliveries_pending_player_idx
  on public.clothing_planned_deliveries (player_id)
  where delivered_at is null;

alter table public.clothing_planned_deliveries enable row level security;

-- RLS sola no basta: sin GRANT explícito PostgREST responde «permission denied for table».
grant usage on type public.clothing_size to authenticated;
grant select, insert, update, delete on table public.clothing_planned_deliveries to authenticated;
grant select, insert, update, delete on table public.clothing_planned_deliveries to service_role;

drop policy if exists clothing_planned_deliveries_select on public.clothing_planned_deliveries;
create policy clothing_planned_deliveries_select on public.clothing_planned_deliveries
  for select to authenticated
  using ((select public.has_portal_role(array['admin', 'manager', 'coach'])));

drop policy if exists clothing_planned_deliveries_write on public.clothing_planned_deliveries;
create policy clothing_planned_deliveries_write on public.clothing_planned_deliveries
  for all to authenticated
  using ((select public.has_portal_role(array['admin', 'manager'])))
  with check ((select public.has_portal_role(array['admin', 'manager'])));

notify pgrst, 'reload schema';
