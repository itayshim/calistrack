-- Make Managed Program lifecycle transitions explicit while retaining immutable version history.
create or replace function public.set_managed_program_lifecycle(
  p_program_id uuid,
  p_status text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
  current_source text;
begin
  if not public.is_admin() then
    raise exception 'administrator access required' using errcode = '42501';
  end if;

  if p_status not in ('unpublished', 'archived') then
    raise exception 'invalid managed program lifecycle target: %', p_status using errcode = '22023';
  end if;

  select status, source
    into current_status, current_source
    from public.managed_programs
   where id = p_program_id
   for update;

  if not found then
    raise exception 'managed program not found' using errcode = 'P0002';
  end if;

  if current_source not in ('admin-created', 'builtin_override') then
    raise exception 'built-in source definitions are immutable' using errcode = '22023';
  end if;

  if p_status = 'unpublished' and current_status <> 'published' then
    raise exception 'invalid managed program lifecycle transition: % to %', current_status, p_status using errcode = '22023';
  end if;

  if p_status = 'archived' and current_status not in ('draft', 'published', 'unpublished') then
    raise exception 'invalid managed program lifecycle transition: % to %', current_status, p_status using errcode = '22023';
  end if;

  update public.managed_programs
     set status = p_status,
         updated_by = auth.uid()
   where id = p_program_id;
end
$$;

revoke all on function public.set_managed_program_lifecycle(uuid, text) from public;
grant execute on function public.set_managed_program_lifecycle(uuid, text) to authenticated;
