-- clothing_* tables were created via SQL migration without PostgREST role grants.
-- RLS policies alone are not enough: authenticated needs explicit table privileges.
--
-- Prerequisite: 20260831130000_clothing_warehouse.sql (creates enum public.clothing_size + tables).

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
