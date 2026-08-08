-- Stable-key availability overlay for immutable source-code built-ins.
create table public.builtin_content_states (
  content_type text not null check (content_type in ('managed_program', 'skill')),
  builtin_key text not null check (builtin_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  availability text not null default 'published' check (availability in ('published', 'unpublished', 'archived')),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (content_type, builtin_key)
);

alter table public.builtin_content_states enable row level security;

create policy "built-in availability readable"
on public.builtin_content_states
for select
using (true);

grant select on public.builtin_content_states to anon, authenticated;
revoke insert, update, delete on public.builtin_content_states from anon, authenticated;

create or replace function public.set_builtin_content_availability(
  p_content_type text,
  p_builtin_key text,
  p_availability text
) returns public.builtin_content_states
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.builtin_content_states;
begin
  if not public.is_admin() then
    raise exception 'administrator access required' using errcode = '42501';
  end if;
  if p_content_type not in ('managed_program', 'skill') then
    raise exception 'invalid built-in content type' using errcode = '22023';
  end if;
  if p_builtin_key is null or p_builtin_key !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'invalid built-in content key' using errcode = '22023';
  end if;
  if p_availability not in ('published', 'unpublished', 'archived') then
    raise exception 'invalid built-in availability' using errcode = '22023';
  end if;

  insert into public.builtin_content_states(content_type, builtin_key, availability, updated_by)
  values (p_content_type, p_builtin_key, p_availability, auth.uid())
  on conflict (content_type, builtin_key) do update
    set availability = excluded.availability,
        updated_by = excluded.updated_by,
        updated_at = now()
  returning * into result;
  return result;
end
$$;

revoke all on function public.set_builtin_content_availability(text, text, text) from public;
grant execute on function public.set_builtin_content_availability(text, text, text) to authenticated;

-- A hidden built-in identity also hides its published override from catalogue reads.
drop policy if exists "published managed programs readable" on public.managed_programs;
create policy "published managed programs readable"
on public.managed_programs
for select
using (
  public.is_admin()
  or public.owns_managed_program_enrollment(id)
  or (
    status = 'published'
    and (
      source <> 'builtin_override'
      or not exists (
        select 1 from public.builtin_content_states state
        where state.content_type = 'managed_program'
          and state.builtin_key = managed_programs.builtin_key
          and state.availability <> 'published'
      )
    )
  )
);

drop policy if exists "published managed program versions readable" on public.managed_program_versions;
create policy "published managed program versions readable"
on public.managed_program_versions
for select
using (
  public.is_admin()
  or public.owns_managed_program_enrollment(program_id, version)
  or (
    lifecycle = 'published'
    and exists (
      select 1 from public.managed_programs program
      where program.id = program_id
        and program.status = 'published'
        and (
          program.source <> 'builtin_override'
          or not exists (
            select 1 from public.builtin_content_states state
            where state.content_type = 'managed_program'
              and state.builtin_key = program.builtin_key
              and state.availability <> 'published'
          )
        )
    )
  )
);
