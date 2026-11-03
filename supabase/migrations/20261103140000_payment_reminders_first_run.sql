-- Primera ejecución real de los avisos de pago: 10 de noviembre de 2026.
--
-- Los dos jobs diarios (payment-reminders-daily / payment-reminders-retry) se dejan en pausa y un
-- tercer job los reactiva el 10 de noviembre a las 07:00 UTC, una hora antes de la primera pasada
-- de las 08:00 UTC. Así el primer envío real cae en el día del aviso y no antes.
--
-- El job de reactivación se repite cada 10 de noviembre (pg_cron no tiene "una sola vez"):
-- es inofensivo, pero puede quitarse después con
--   select cron.unschedule('payment-reminders-enable');
-- Additive only: no toca tablas de datos.

select cron.alter_job(jobid, active := false)
  from cron.job
 where jobname in ('payment-reminders-daily', 'payment-reminders-retry');

select cron.schedule(
  'payment-reminders-enable',
  '0 7 10 11 *',
  $$select cron.alter_job(jobid, active := true)
      from cron.job
     where jobname in ('payment-reminders-daily', 'payment-reminders-retry')$$
);
