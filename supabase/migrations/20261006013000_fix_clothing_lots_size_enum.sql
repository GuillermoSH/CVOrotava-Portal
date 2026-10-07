-- Fix drift: lots/order lines size was text in prod; movements expect clothing_size.
-- Symptom: write-off/delivery RPC fails with
--   column "size" is of type clothing_size but expression is of type text

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clothing_inventory_lots'
      and column_name = 'size'
      and udt_name = 'text'
  ) then
    alter table public.clothing_inventory_lots
      alter column size type public.clothing_size
      using size::public.clothing_size;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clothing_supplier_order_lines'
      and column_name = 'size'
      and udt_name = 'text'
  ) then
    alter table public.clothing_supplier_order_lines
      alter column size type public.clothing_size
      using size::public.clothing_size;
  end if;
end;
$$;

-- Defensive cast in stock-out (covers residual text / rowtype quirks).
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
    v_lot.size::public.clothing_size,
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

notify pgrst, 'reload schema';
