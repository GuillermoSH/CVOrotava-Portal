-- Salidas de inventario: entrega a persona y baja de stock.
-- Deduce unidades del lote (lo elimina si llega a 0) y deja un registro.

create table if not exists public.clothing_stock_movements (
  id uuid not null default gen_random_uuid(),
  kind text not null check (kind = any (array['delivery'::text, 'write_off'::text])),
  lot_id uuid,
  product_id uuid not null,
  size public.clothing_size not null,
  quantity integer not null check (quantity > 0),
  recipient_name text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint clothing_stock_movements_pkey primary key (id),
  constraint clothing_stock_movements_lot_id_fkey
    foreign key (lot_id) references public.clothing_inventory_lots (id) on delete set null,
  constraint clothing_stock_movements_product_id_fkey
    foreign key (product_id) references public.clothing_products (id),
  constraint clothing_stock_movements_delivery_recipient_chk
    check (kind <> 'delivery' or (recipient_name is not null and length(btrim(recipient_name)) > 0))
);

create index if not exists clothing_stock_movements_created_at_idx
  on public.clothing_stock_movements (created_at desc);
create index if not exists clothing_stock_movements_product_id_idx
  on public.clothing_stock_movements (product_id);
create index if not exists clothing_stock_movements_kind_idx
  on public.clothing_stock_movements (kind);

alter table public.clothing_stock_movements enable row level security;

grant select, insert on table public.clothing_stock_movements to authenticated;
grant select, insert, delete on table public.clothing_stock_movements to service_role;

drop policy if exists clothing_stock_movements_select on public.clothing_stock_movements;
create policy clothing_stock_movements_select on public.clothing_stock_movements
  for select to authenticated
  using ((select public.has_portal_role(array['admin', 'manager', 'coach'])));

drop policy if exists clothing_stock_movements_insert on public.clothing_stock_movements;
create policy clothing_stock_movements_insert on public.clothing_stock_movements
  for insert to authenticated
  with check ((select public.has_portal_role(array['admin', 'manager'])));

create or replace function public.apply_clothing_stock_out(
  p_lot_id uuid,
  p_kind text,
  p_quantity integer,
  p_recipient_name text default null,
  p_notes text default null,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lot public.clothing_inventory_lots%rowtype;
  v_movement_id uuid;
  v_recipient text;
  v_notes text;
begin
  if p_kind not in ('delivery', 'write_off') then
    raise exception 'Tipo de salida no válido';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Cantidad inválida';
  end if;

  v_recipient := nullif(btrim(coalesce(p_recipient_name, '')), '');
  v_notes := nullif(btrim(coalesce(p_notes, '')), '');

  if p_kind = 'delivery' and v_recipient is null then
    raise exception 'Indica a quién se entrega';
  end if;

  select * into v_lot
  from public.clothing_inventory_lots
  where id = p_lot_id
  for update;

  if not found then
    raise exception 'Lote no encontrado';
  end if;

  if p_quantity > v_lot.quantity then
    raise exception 'No hay tantas unidades en este lote';
  end if;

  insert into public.clothing_stock_movements (
    kind,
    lot_id,
    product_id,
    size,
    quantity,
    recipient_name,
    notes,
    created_by
  )
  values (
    p_kind,
    v_lot.id,
    v_lot.product_id,
    v_lot.size,
    p_quantity,
    v_recipient,
    v_notes,
    coalesce(p_created_by, auth.uid())
  )
  returning id into v_movement_id;

  if p_quantity = v_lot.quantity then
    delete from public.clothing_inventory_lots where id = v_lot.id;
  else
    update public.clothing_inventory_lots
    set
      quantity = v_lot.quantity - p_quantity,
      updated_at = timezone('utc'::text, now())
    where id = v_lot.id;
  end if;

  return v_movement_id;
end;
$$;

revoke all on function public.apply_clothing_stock_out(uuid, text, integer, text, text, uuid) from public;
grant execute on function public.apply_clothing_stock_out(uuid, text, integer, text, text, uuid) to authenticated;
grant execute on function public.apply_clothing_stock_out(uuid, text, integer, text, text, uuid) to service_role;

notify pgrst, 'reload schema';
