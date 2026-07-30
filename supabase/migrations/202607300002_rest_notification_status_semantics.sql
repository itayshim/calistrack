-- Add transition diagnostics first. These clauses are safe if a local test run
-- previously added some or all of the columns.
alter table public.scheduled_rest_notifications
  add column if not exists handled_reason text,
  add column if not exists last_transition_reason text,
  add column if not exists last_transition_source text,
  add column if not exists last_transition_at timestamptz;

-- Remove whichever status CHECK is present (the production constraint name may
-- differ). This must happen before writing the new foreground_handled value.
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

-- Temporarily accept both the legacy and current status vocabulary while rows
-- are converted. This prevents invalid intermediate states.
alter table public.scheduled_rest_notifications
  add constraint scheduled_rest_notifications_status_compat_check
  check (status in (
    'scheduled',
    'sending',
    'sent',
    'handled',
    'foreground_handled',
    'cancelled',
    'replaced',
    'retrying',
    'failed'
  ));

update public.scheduled_rest_notifications
set
  status = 'foreground_handled',
  handled_reason = coalesce(handled_reason, 'legacy_handled'),
  last_transition_reason = coalesce(last_transition_reason, 'legacy_handled'),
  last_transition_source = coalesce(last_transition_source, 'legacy'),
  last_transition_at = coalesce(last_transition_at, updated_at)
where status = 'handled';

-- Remove compatibility with handled after all legacy rows have been converted.
alter table public.scheduled_rest_notifications
  drop constraint scheduled_rest_notifications_status_compat_check;

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

-- Diagnostic lookup support is added only after the data and final constraint
-- are valid.
create index if not exists scheduled_rest_notifications_transition_idx
  on public.scheduled_rest_notifications (last_transition_at desc);
