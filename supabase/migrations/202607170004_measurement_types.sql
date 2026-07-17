-- Extend the canonical global exercise table with explicit workout measurements.
-- Safe to run more than once. Existing exercise rows and identifiers are preserved.
do $migration$
declare
  measurement_constraint record;
  unsupported_values text;
begin
  if to_regclass('public.global_exercises') is null then
    raise exception
      'Required table public.global_exercises does not exist. Apply the global content migration first.';
  end if;

  alter table public.global_exercises
    add column if not exists measurement_type text;

  -- PostgreSQL generated global_exercises_measurement_type_check for the
  -- original inline check, but discover constraints by definition so this also
  -- works when a project uses a different constraint name.
  for measurement_constraint in
    select constraint_row.conname
    from pg_constraint constraint_row
    where constraint_row.conrelid = 'public.global_exercises'::regclass
      and constraint_row.contype = 'c'
      and pg_get_constraintdef(constraint_row.oid) ilike '%measurement_type%'
  loop
    execute format(
      'alter table public.global_exercises drop constraint %I',
      measurement_constraint.conname
    );
  end loop;

  update public.global_exercises
  set measurement_type = 'duration'
  where measurement_type = 'time';

  -- Rows created before the column existed are repetition exercises by default.
  update public.global_exercises
  set measurement_type = 'reps'
  where measurement_type is null;

  select string_agg(distinct measurement_type, ', ' order by measurement_type)
  into unsupported_values
  from public.global_exercises
  where measurement_type not in ('reps', 'duration', 'weighted_reps');

  if unsupported_values is not null then
    raise exception
      'Unsupported measurement_type values in public.global_exercises: %',
      unsupported_values;
  end if;

  alter table public.global_exercises
    alter column measurement_type set default 'reps',
    alter column measurement_type set not null;

  alter table public.global_exercises
    add constraint global_exercises_measurement_type_check
    check (measurement_type in ('reps', 'duration', 'weighted_reps'));
end
$migration$;
