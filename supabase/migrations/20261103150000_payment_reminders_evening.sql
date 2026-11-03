-- Los avisos de pago salen a las 20:00 (hora de Canarias, Atlantic/Canary) en lugar de las 08:00 UTC.
--
-- pg_cron trabaja en UTC y Canarias cambia de hora (UTC+0 en invierno, UTC+1 en verano), así que
-- un horario fijo en UTC se movería una hora dos veces al año. Los jobs se despiertan a las 19:00
-- y a las 20:00 UTC y solo actúan cuando en Canarias es la hora 20: siempre a las 20:00 locales.
--
--   · payment-reminders-daily: 20:00 hora de Canarias.
--   · payment-reminders-retry: 20:30 hora de Canarias (reintento; payment_reminders impide repetir
--     un aviso el mismo día, así que solo continúa lo que la primera pasada no llegó a enviar).
--
-- alter_job no cambia el estado activo/en pausa: los jobs siguen pausados hasta que el job
-- payment-reminders-enable los reactive el 10 de noviembre (migración payment_reminders_first_run).
-- Additive only: no toca tablas de datos.

select cron.alter_job(
  jobid,
  schedule := '0 19,20 * * *',
  command := $$select private.call_payment_reminders()
                where extract(hour from now() at time zone 'Atlantic/Canary') = 20$$
)
from cron.job
where jobname = 'payment-reminders-daily';

select cron.alter_job(
  jobid,
  schedule := '30 19,20 * * *',
  command := $$select private.call_payment_reminders()
                where extract(hour from now() at time zone 'Atlantic/Canary') = 20$$
)
from cron.job
where jobname = 'payment-reminders-retry';
