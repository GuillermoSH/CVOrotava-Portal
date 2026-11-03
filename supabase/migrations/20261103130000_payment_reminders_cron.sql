-- Planificador diario de los avisos de pago en Supabase (pg_cron + pg_net), en lugar del cron de Vercel.
--
-- Qué hace: cada día a las 08:00 UTC llama por HTTP a /api/cron/payment-reminders del Portal con
-- `Authorization: Bearer <CRON_SECRET>`. La lógica (qué avisos tocan, correo, registro en
-- payment_reminders) sigue en la app; Supabase solo despierta la ruta. Ventajas: un único sitio
-- para las tareas programadas del club, sin depender del plan de Vercel y con histórico en SQL.
--
-- Antes de aplicarla hay que guardar DOS secretos en el Vault (una sola vez, en el SQL Editor):
--
--   select vault.create_secret('https://<dominio-de-produccion>/api/cron/payment-reminders',
--                              'payment_reminders_cron_url');
--   select vault.create_secret('<el mismo valor que CRON_SECRET en Vercel>',
--                              'payment_reminders_cron_secret');
--
-- Los valores nunca viven en el repositorio ni en esta migración.
--
-- Additive only: no toca tablas de datos.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Esquema privado: no se expone por la API REST de Supabase.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Lanza la ruta del cron. `query` permite probar: '?dryRun=1' solo cuenta los avisos de hoy sin
-- enviar nada; '?limit=1' envía como mucho uno. Devuelve el id de la petición en net._http_response.
create or replace function private.call_payment_reminders(query text default '')
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  cron_url text;
  cron_secret text;
begin
  select decrypted_secret into cron_url
    from vault.decrypted_secrets where name = 'payment_reminders_cron_url';
  select decrypted_secret into cron_secret
    from vault.decrypted_secrets where name = 'payment_reminders_cron_secret';

  if cron_url is null or cron_secret is null then
    raise exception 'Faltan los secretos payment_reminders_cron_url / payment_reminders_cron_secret en el Vault';
  end if;

  return net.http_get(
    url := cron_url || coalesce(query, ''),
    headers := jsonb_build_object('Authorization', 'Bearer ' || cron_secret),
    -- La ruta envía los correos uno a uno: margen de sobra antes de que pg_net desista.
    timeout_milliseconds := 120000
  );
end;
$$;

revoke all on function private.call_payment_reminders(text) from public, anon, authenticated;

-- Diario a las 08:00 UTC (08:00 o 09:00 en Canarias según horario de verano).
-- Una segunda pasada media hora después hace de reintento: la tabla payment_reminders impide
-- repetir un aviso el mismo día, así que si la primera se corta a mitad la segunda sigue.
select cron.schedule(
  'payment-reminders-daily',
  '0 8 * * *',
  $$select private.call_payment_reminders()$$
);
select cron.schedule(
  'payment-reminders-retry',
  '30 8 * * *',
  $$select private.call_payment_reminders()$$
);
