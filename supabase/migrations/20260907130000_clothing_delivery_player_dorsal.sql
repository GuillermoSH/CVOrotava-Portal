-- Dorsal en lotes de inventario y entrega ligada a un jugador del roster.
-- Prerequisite: 20260907120000_clothing_stock_movements.sql

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

drop function if exists public.apply_clothing_stock_out(uuid, text, integer, text, text, uuid);
drop function if exists public.apply_clothing_stock_out(uuid, text, integer, text, text, uuid, uuid);

create or replace function public.apply_clothing_stock_out(
  p_lot_id uuid,
  p_kind text,
  p_quantity integer,
  p_recipient_name text default null,
  p_notes text default null,
  p_created_by uuid default null,
  p_player_id uuid default null
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
  v_player_name text;
begin
  if p_kind not in ('delivery', 'write_off') then
    raise exception 'Tipo de salida no válido';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Cantidad inválida';
  end if;

  v_recipient := nullif(btrim(coalesce(p_recipient_name, '')), '');
  v_notes := nullif(btrim(coalesce(p_notes, '')), '');

  if p_kind = 'delivery' then
    if p_player_id is null then
      raise exception 'Indica el jugador';
    end if;

    select full_name into v_player_name
    from public.players
    where id = p_player_id;

    if not found then
      raise exception 'Jugador no encontrado';
    end if;

    v_recipient := coalesce(v_recipient, nullif(btrim(v_player_name), ''));
    if v_recipient is null then
      raise exception 'Indica a quién se entrega';
    end if;
  elsif p_player_id is not null then
    raise exception 'La baja de stock no se asocia a un jugador';
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
    created_by,
    jersey_number,
    player_id
  )
  values (
    p_kind,
    v_lot.id,
    v_lot.product_id,
    v_lot.size,
    p_quantity,
    v_recipient,
    v_notes,
    coalesce(p_created_by, auth.uid()),
    v_lot.jersey_number,
    case when p_kind = 'delivery' then p_player_id else null end
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

revoke all on function public.apply_clothing_stock_out(uuid, text, integer, text, text, uuid, uuid) from public;
grant execute on function public.apply_clothing_stock_out(uuid, text, integer, text, text, uuid, uuid) to authenticated;
grant execute on function public.apply_clothing_stock_out(uuid, text, integer, text, text, uuid, uuid) to service_role;

drop function if exists public.assign_clothing_jersey_numbers(uuid, smallint[]);

create or replace function public.assign_clothing_jersey_numbers(
  p_lot_id uuid,
  p_jersey_numbers smallint[]
)
returns uuid[]
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lot public.clothing_inventory_lots%rowtype;
  v_number smallint;
  v_new_id uuid;
  v_ids uuid[] := '{}';
  v_remaining integer;
begin
  if p_jersey_numbers is null or cardinality(p_jersey_numbers) < 1 then
    raise exception 'Indica al menos un dorsal';
  end if;

  if exists (
    select 1
    from unnest(p_jersey_numbers) as jersey
    where jersey is null or jersey < 0 or jersey > 99
  ) then
    raise exception 'Los dorsales deben estar entre 0 y 99';
  end if;

  if (
    select count(*) from unnest(p_jersey_numbers) as jersey
  ) <> (
    select count(distinct jersey) from unnest(p_jersey_numbers) as jersey
  ) then
    raise exception 'Hay dorsales repetidos';
  end if;

  select * into v_lot
  from public.clothing_inventory_lots
  where id = p_lot_id
  for update;

  if not found then
    raise exception 'Lote no encontrado';
  end if;

  if v_lot.jersey_number is not null then
    raise exception 'Este lote ya tiene dorsal';
  end if;

  if cardinality(p_jersey_numbers) > v_lot.quantity then
    raise exception 'Hay más dorsales que unidades en el lote';
  end if;

  foreach v_number in array p_jersey_numbers loop
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
      v_lot.product_id,
      v_lot.size,
      1,
      v_lot.status,
      v_lot.storage_location_id,
      v_lot.source_order_id,
      v_lot.source_line_id,
      v_lot.source_type,
      v_lot.notes,
      v_lot.returned_from_serigraphy_at,
      v_number
    )
    returning id into v_new_id;

    v_ids := array_append(v_ids, v_new_id);
  end loop;

  v_remaining := v_lot.quantity - cardinality(p_jersey_numbers);

  if v_remaining = 0 then
    delete from public.clothing_inventory_lots where id = v_lot.id;
  else
    update public.clothing_inventory_lots
    set
      quantity = v_remaining,
      updated_at = timezone('utc'::text, now())
    where id = v_lot.id;
  end if;

  return v_ids;
end;
$$;

revoke all on function public.assign_clothing_jersey_numbers(uuid, smallint[]) from public;
grant execute on function public.assign_clothing_jersey_numbers(uuid, smallint[]) to authenticated;
grant execute on function public.assign_clothing_jersey_numbers(uuid, smallint[]) to service_role;

notify pgrst, 'reload schema';
