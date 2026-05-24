create or replace function public.sync_expired_subscriptions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  perform set_config('TimeZone', 'Europe/Rome', true);

  update public.restaurants
  set abbonamento_attivo = false
  where abbonamento_attivo is true
    and abbonamento_scadenza is not null
    and nullif(abbonamento_scadenza::text, '') is not null
    and (nullif(abbonamento_scadenza::text, '')::date) < current_date;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

do $$
declare
  existing_job_id integer;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'sync-expired-subscriptions'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'sync-expired-subscriptions',
    '0 * * * *',
    $cmd$select public.sync_expired_subscriptions();$cmd$
  );
end $$;
