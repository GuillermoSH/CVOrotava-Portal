-- Calcetines + artículo de tienda (is_shop_item, false por defecto).

alter table public.clothing_products
  add column if not exists is_shop_item boolean;

update public.clothing_products
set is_shop_item = false
where is_shop_item is null;

alter table public.clothing_products
  alter column is_shop_item set default false;

alter table public.clothing_products
  alter column is_shop_item set not null;

alter table public.clothing_products
  drop constraint if exists clothing_products_category_check;

alter table public.clothing_products
  add constraint clothing_products_category_check check (
    category = any (
      array[
        'shirt_warmup'::text,
        'shirt_competition'::text,
        'jacket'::text,
        'pants_short'::text,
        'shorts'::text,
        'sweatshirt'::text,
        'pants_long'::text,
        'backpack'::text,
        'socks'::text
      ]
    )
  );

create index if not exists clothing_products_shop_item_idx
  on public.clothing_products (is_shop_item)
  where is_shop_item = true;
