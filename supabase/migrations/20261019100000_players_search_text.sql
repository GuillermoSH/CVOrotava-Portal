-- Búsqueda de jugadores sin tildes: «maria» encuentra «María».
create extension if not exists unaccent with schema extensions;

-- unaccent() es STABLE; este wrapper es seguro como IMMUTABLE porque el diccionario es fijo.
create or replace function public.immutable_unaccent(value text)
returns text
language sql
immutable
parallel safe
strict
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, value)
$$;

alter table public.players
  add column if not exists search_text text
  generated always as (
    lower(
      public.immutable_unaccent(
        coalesce(first_name, '') || ' ' ||
        coalesce(last_name, '') || ' ' ||
        coalesce(full_name, '') || ' ' ||
        coalesce(dni, '')
      )
    )
  ) stored;
