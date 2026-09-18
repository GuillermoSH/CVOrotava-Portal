-- Devoluciones de ropa: kind return, vínculo a entrega y reincorporación a stock.
-- Idempotent: asegura columnas de dorsal/jugador (por si no se aplicó 20260907130000).

-- --- Prerrequisito: dorsal en lotes + player_id / jersey en movements ---
alter table public.clothing_inventory_lots
  add column if not exists jersey_number smallint;

alter table public.clothing_inventory_lots
  drop constraint if exists clothing_inventory_lots_jersey_number_chk;

alter table public.clothing_inventory_lots
  add constraint clothing_inventory_lots_jersey_number_chk
  check (jersey_number is null or (jersey_number >= 0 and jersey_number <= 99));

alter table public.clothing_inventory_lots
  drop constraint if exists clothing_inventory_lots_numbered_unit_chk;

alter table public.clothing_inventory_lots
  add constraint clothing_inventory_lots_numbered_unit_chk
  check (jersey_number is null or quantity = 1);

create index if not exists clothing_inventory_lots_jersey_number_idx
  on public.clothing_inventory_lots (jersey_number)
  where jersey_number is not null;

alter table public.clothing_stock_movements
  add column if not exists jersey_number smallint;

alter table public.clothing_stock_movements
  add column if not exists player_id uuid;

alter table public.clothing_stock_movements
  drop constraint if exists clothing_stock_movements_jersey_number_chk;

alter table public.clothing_stock_movements
  add constraint clothing_stock_movements_jersey_number_chk
  check (jersey_number is null or (jersey_number >= 0 and jersey_number <= 99));

alter table public.clothing_stock_movements
  drop constraint if exists clothing_stock_movements_player_id_fkey;

alter table public.clothing_stock_movements
  add constraint clothing_stock_movements_player_id_fkey
  foreign key (player_id) references public.players (id) on delete set null;

create index if not exists clothing_stock_movements_player_id_idx
  on public.clothing_stock_movements (player_id)
  where player_id is not null;

grant select on table public.players to authenticated;
grant select on table public.teams to authenticated;

-- --- Devoluciones ---
alter table public.clothing_stock_movements
  drop constraint if exists clothing_stock_movements_kind_check;

alter table public.clothing_stock_movements
  add constraint clothing_stock_movements_kind_check
  check (kind = any (array['delivery'::text, 'write_off'::text, 'return'::text]));

alter table public.clothing_stock_movements
  add column if not exists related_movement_id uuid;

alter table public.clothing_stock_movements
  drop constraint if exists clothing_stock_movements_related_movement_id_fkey;

alter table public.clothing_stock_movements
  add constraint clothing_stock_movements_related_movement_id_fkey
  foreign key (related_movement_id) references public.clothing_stock_movements (id) on delete set null;

alter table public.clothing_stock_movements
  drop constraint if exists clothing_stock_movements_return_player_chk;

alter table public.clothing_stock_movements
  add constraint clothing_stock_movements_return_player_chk
  check (kind <> 'return' or player_id is not null);

create index if not exists clothing_stock_movements_related_movement_id_idx
  on public.clothing_stock_movements (related_movement_id)
  where related_movement_id is not null;

create index if not exists clothing_stock_movements_player_kind_idx
  on public.clothing_stock_movements (player_id, kind)
  where player_id is not null;

create index if not exists clothing_stock_movements_jersey_number_idx
  on public.clothing_stock_movements (jersey_number)
  where jersey_number is not null;

drop function if exists public.apply_clothing_stock_return(
  uuid, uuid, public.clothing_size, integer, smallint, uuid, uuid, text, uuid
);

create or replace function public.apply_clothing_stock_return(
  p_player_id uuid,
  p_product_id uuid,
  p_size public.clothing_size,
  p_quantity integer,
  p_jersey_number smallint default null,
  p_related_movement_id uuid default null,
  p_storage_location_id uuid default null,
  p_notes text default null,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_player_name text;
  v_delivery public.clothing_stock_movements%rowtype;
  v_already_returned integer;
  v_open_qty integer;
  v_notes text;
  v_lot_id uuid;
  v_movement_id uuid;
  v_status text;
  v_jersey smallint;
begin
  if p_player_id is null then
    raise exception 'Indica el jugador';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Cantidad inválida';
  end if;

  if p_jersey_number is not null and (p_jersey_number < 0 or p_jersey_number > 99) then
    raise exception 'El dorsal debe estar entre 0 y 99';
  end if;

  if p_jersey_number is not null and p_quantity <> 1 then
    raise exception 'Una prenda con dorsal es una sola unidad';
  end if;

  select full_name into v_player_name
  from public.players
  where id = p_player_id;

  if not found then
    raise exception 'Jugador no encontrado';
  end if;

  v_notes := nullif(btrim(coalesce(p_notes, '')), '');
  v_jersey := p_jersey_number;

  if p_related_movement_id is not null then
    select * into v_delivery
    from public.clothing_stock_movements
    where id = p_related_movement_id
    for update;

    if not found then
      raise exception 'Entrega original no encontrada';
    end if;

    if v_delivery.kind <> 'delivery' then
      raise exception 'Solo se puede devolver una entrega';
    end if;

    if v_delivery.player_id is distinct from p_player_id then
      raise exception 'La entrega no pertenece a este jugador';
    end if;

    if v_delivery.product_id <> p_product_id
      or v_delivery.size <> p_size
      or v_delivery.jersey_number is distinct from v_jersey
    then
      raise exception 'La prenda no coincide con la entrega original';
    end if;

    select coalesce(sum(quantity), 0) into v_already_returned
    from public.clothing_stock_movements
    where kind = 'return'
      and related_movement_id = v_delivery.id;

    v_open_qty := v_delivery.quantity - v_already_returned;
    if p_quantity > v_open_qty then
      raise exception 'Solo quedan % uds. por devolver de esa entrega', greatest(v_open_qty, 0);
    end if;
  else
    select coalesce(sum(case when kind = 'delivery' then quantity else 0 end), 0)
         - coalesce(sum(case when kind = 'return' then quantity else 0 end), 0)
      into v_open_qty
    from public.clothing_stock_movements
    where player_id = p_player_id
      and product_id = p_product_id
      and size = p_size
      and jersey_number is not distinct from v_jersey
      and kind in ('delivery', 'return');

    if p_quantity > v_open_qty then
      raise exception 'El jugador no tiene tantas unidades en posesión';
    end if;
  end if;

  if p_storage_location_id is not null then
    if not exists (
      select 1
      from public.clothing_storage_locations
      where id = p_storage_location_id
        and location_type = 'box'
    ) then
      raise exception 'La ubicación debe ser una caja';
    end if;
    v_status := 'stored';
  else
    v_status := 'pending_storage';
  end if;

  insert into public.clothing_inventory_lots (
    product_id,
    size,
    quantity,
    status,
    storage_location_id,
    source_order_id,
    source_line_id,
    source_type,
    notes,
    returned_from_serigraphy_at,
    jersey_number
  )
  values (
    p_product_id,
    p_size,
    p_quantity,
    v_status,
    p_storage_location_id,
    null,
    null,
    'manual',
    coalesce(v_notes, 'Devolución'),
    null,
    v_jersey
  )
  returning id into v_lot_id;

  insert into public.clothing_stock_movements (
    kind,
    lot_id,
    product_id,
    size,
    quantity,
    recipient_name,
    notes,
    created_by,
    jersey_number,
    player_id,
    related_movement_id
  )
  values (
    'return',
    v_lot_id,
    p_product_id,
    p_size,
    p_quantity,
    nullif(btrim(v_player_name), ''),
    v_notes,
    coalesce(p_created_by, auth.uid()),
    v_jersey,
    p_player_id,
    p_related_movement_id
  )
  returning id into v_movement_id;

  return v_movement_id;
end;
$$;

revoke all on function public.apply_clothing_stock_return(
  uuid, uuid, public.clothing_size, integer, smallint, uuid, uuid, text, uuid
) from public;
grant execute on function public.apply_clothing_stock_return(
  uuid, uuid, public.clothing_size, integer, smallint, uuid, uuid, text, uuid
) to authenticated;
grant execute on function public.apply_clothing_stock_return(
  uuid, uuid, public.clothing_size, integer, smallint, uuid, uuid, text, uuid
) to service_role;

notify pgrst, 'reload schema';
