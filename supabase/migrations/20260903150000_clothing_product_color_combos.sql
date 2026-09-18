-- Prendas: ampliar color a combinaciones rojo/blanco, negro/blanco, rojo/negro.

alter table public.clothing_products
  drop constraint if exists clothing_products_color_check;

alter table public.clothing_products
  add constraint clothing_products_color_check check (
    color = any (
      array[
        'blanco'::text,
        'negro'::text,
        'rojo'::text,
        'rojo_blanco'::text,
        'negro_blanco'::text,
        'rojo_negro'::text
      ]
    )
  );
