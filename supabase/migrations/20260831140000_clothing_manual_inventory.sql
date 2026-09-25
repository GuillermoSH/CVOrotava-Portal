-- Manual / opening-balance inventory lots (no supplier order).

alter table public.clothing_inventory_lots
  add column if not exists source_type text not null default 'order'
    check (source_type = any (array['order'::text, 'manual'::text]));

alter table public.clothing_inventory_lots
  add column if not exists notes text;

comment on column public.clothing_inventory_lots.source_type is
  'order = generated from supplier order flow; manual = opening balance / legacy stock';
comment on column public.clothing_inventory_lots.notes is
  'Optional context, e.g. leftover from previous season';
