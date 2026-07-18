-- Reusable, administrator-managed exercise taxonomy.
create table if not exists public.exercise_taxonomy_values (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('category','movement_family','muscle','keyword')),
  value text not null check (length(trim(value)) > 0),
  normalized_value text not null check (normalized_value ~ '^[a-z0-9]+$'),
  label_en text,
  label_he text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique(kind, normalized_value)
);

insert into public.exercise_taxonomy_values(kind, value, normalized_value)
values
  ('category','push','push'), ('category','pull','pull'),
  ('category','legs','legs'), ('category','core','core'),
  ('category','skill','skill'), ('category','mobility','mobility'),
  ('category','cardio','cardio'), ('category','full-body','fullbody')
on conflict (kind, normalized_value) do nothing;

insert into public.exercise_taxonomy_values(kind, value, normalized_value)
select distinct 'movement_family', movement_family,
  lower(regexp_replace(movement_family, '[^a-zA-Z0-9]+', '', 'g'))
from public.global_exercises
where length(regexp_replace(movement_family, '[^a-zA-Z0-9]+', '', 'g')) > 0
on conflict (kind, normalized_value) do nothing;

insert into public.exercise_taxonomy_values(kind, value, normalized_value)
select distinct 'muscle', muscle.value,
  lower(regexp_replace(muscle.value, '[^a-zA-Z0-9]+', '', 'g'))
from public.global_exercises exercise
cross join lateral jsonb_array_elements_text(exercise.muscles) muscle(value)
where length(regexp_replace(muscle.value, '[^a-zA-Z0-9]+', '', 'g')) > 0
on conflict (kind, normalized_value) do nothing;

do $$
declare constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.global_exercises'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%category%'
  loop
    execute format('alter table public.global_exercises drop constraint %I', constraint_row.conname);
  end loop;
end $$;

create or replace function public.validate_exercise_category_taxonomy()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.exercise_taxonomy_values
    where kind = 'category' and value = new.category
  ) then
    raise exception 'Unsupported exercise category'
      using errcode = '23514', constraint = 'global_exercises_category_taxonomy_check';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_global_exercise_category on public.global_exercises;
create trigger validate_global_exercise_category
before insert or update of category on public.global_exercises
for each row execute function public.validate_exercise_category_taxonomy();

-- Correct the existing enriched exercise in place; its ID and related rows remain unchanged.
update public.global_exercises
set category = 'pull', movement_family = 'Pull-Up'
where stable_key = 'l-sit-pull-up'
  and (category is distinct from 'pull' or movement_family is distinct from 'Pull-Up');

alter table public.exercise_taxonomy_values enable row level security;
drop policy if exists "taxonomy is publicly readable" on public.exercise_taxonomy_values;
create policy "taxonomy is publicly readable" on public.exercise_taxonomy_values
for select using (true);
drop policy if exists "admins create taxonomy" on public.exercise_taxonomy_values;
create policy "admins create taxonomy" on public.exercise_taxonomy_values
for insert with check (public.is_admin() and created_by = auth.uid());
drop policy if exists "admins update taxonomy" on public.exercise_taxonomy_values;
create policy "admins update taxonomy" on public.exercise_taxonomy_values
for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins delete taxonomy" on public.exercise_taxonomy_values;
create policy "admins delete taxonomy" on public.exercise_taxonomy_values
for delete using (public.is_admin());

grant select on public.exercise_taxonomy_values to anon, authenticated;
grant insert, update, delete on public.exercise_taxonomy_values to authenticated;
