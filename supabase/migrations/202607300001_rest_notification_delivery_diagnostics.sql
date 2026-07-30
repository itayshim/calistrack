alter table public.scheduled_rest_notifications
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists last_error_code text,
  add column if not exists last_error_message text;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'scheduled_rest_notifications'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format(
      'alter table public.scheduled_rest_notifications drop constraint %I',
      constraint_name
    );
  end loop;
end $$;

alter table public.scheduled_rest_notifications
  add constraint scheduled_rest_notifications_status_check
  check (status in (
    'scheduled',
    'sending',
    'sent',
    'cancelled',
    'handled',
    'failed',
    'retrying'
  ));

create index if not exists scheduled_rest_notifications_retry_idx
  on public.scheduled_rest_notifications (next_attempt_at)
  where status = 'retrying';
