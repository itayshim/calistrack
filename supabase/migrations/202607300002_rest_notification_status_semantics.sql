alter table public.scheduled_rest_notifications
  add column if not exists handled_reason text,
  add column if not exists last_transition_reason text,
  add column if not exists last_transition_source text,
  add column if not exists last_transition_at timestamptz;

update public.scheduled_rest_notifications
set
  status = 'foreground_handled',
  handled_reason = coalesce(handled_reason, 'legacy_handled'),
  last_transition_reason = coalesce(last_transition_reason, 'legacy_handled'),
  last_transition_source = coalesce(last_transition_source, 'legacy'),
  last_transition_at = coalesce(last_transition_at, updated_at)
where status = 'handled';

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
    'foreground_handled',
    'cancelled',
    'replaced',
    'retrying',
    'failed'
  ));
