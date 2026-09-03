-- Prendas: name → model, nuevas categorías y color.
-- Safe to re-run where noted.

-- 1. Renombrar columna name → model
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clothing_products'
      and column_name = 'name'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clothing_products'
      and column_name = 'model'
  ) then
    alter table public.clothing_products rename column name to model;
  end if;
end $$;

-- 2. Añadir color (blanco | negro | rojo)
alter table public.clothing_products
  add column if not exists color text;

update public.clothing_products
set color = 'blanco'
where color is null;

alter table public.clothing_products
  alter column color set default 'blanco';

alter table public.clothing_products
  alter column color set not null;

-- 3. Quitar check antiguo ANTES de migrar valores (shirt → shirt_competition, etc.)
alter table public.clothing_products
  drop constraint if exists clothing_products_category_check;

-- 4. Migrar categorías legacy → nuevas claves
update public.clothing_products set category = 'shirt_competition' where category = 'shirt';
update public.clothing_products set category = 'pants_short' where category = 'pants';
update public.clothing_products set category = 'shirt_competition' where category = 'other';

-- jacket y backpack se mantienen

-- 5. Nuevo check de categoría
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
        'backpack'::text
      ]
    )
  );

-- 6. Check de color
alter table public.clothing_products
  drop constraint if exists clothing_products_color_check;

alter table public.clothing_products
  add constraint clothing_products_color_check check (
    color = any (array['blanco'::text, 'negro'::text, 'rojo'::text])
  );

-- 7. Índice único lógico: mismo modelo + color + categoría + temporada
drop index if exists public.clothing_products_model_color_category_season_uidx;

create unique index if not exists clothing_products_model_color_category_season_uidx
  on public.clothing_products (
    lower(trim(model)),
    color,
    category,
    season
  );
