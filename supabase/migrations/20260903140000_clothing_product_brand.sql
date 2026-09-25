-- Prendas: columna marca (Hummel, Aqua Royal, Joma, Errea).
-- Safe to re-run where noted.

alter table public.clothing_products
  add column if not exists brand text;

update public.clothing_products
set brand = 'hummel'
where brand is null;

alter table public.clothing_products
  alter column brand set default 'hummel';

alter table public.clothing_products
  alter column brand set not null;

alter table public.clothing_products
  drop constraint if exists clothing_products_brand_check;

alter table public.clothing_products
  add constraint clothing_products_brand_check check (
    brand = any (
      array[
        'hummel'::text,
        'aqua_royal'::text,
        'joma'::text,
        'errea'::text
      ]
    )
  );

-- Unicidad: modelo + marca + color + categoría + temporada
drop index if exists public.clothing_products_model_color_category_season_uidx;

create unique index if not exists clothing_products_model_brand_color_category_season_uidx
  on public.clothing_products (
    lower(trim(model)),
    brand,
    color,
    category,
    season
  );
