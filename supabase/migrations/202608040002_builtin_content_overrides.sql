-- Administrators may version built-in content without mutating source definitions.
alter table public.skills drop constraint if exists skills_source_check;
alter table public.skills add constraint skills_source_check check (source in ('built-in','admin-created','builtin_override'));
alter table public.skills add column if not exists builtin_key text;
alter table public.skills add column if not exists based_on_builtin_hash text;
alter table public.skills add constraint skills_override_identity_check check (
  (source='builtin_override' and builtin_key=stable_key and based_on_builtin_hash is not null)
  or (source<>'builtin_override' and builtin_key is null)
);
create unique index if not exists skills_one_builtin_override on public.skills(builtin_key) where source='builtin_override';

alter table public.managed_programs drop constraint if exists managed_programs_source_check;
alter table public.managed_programs add constraint managed_programs_source_check check (source in ('built-in','admin-created','builtin_override'));
alter table public.managed_programs add column if not exists builtin_key text;
alter table public.managed_programs add column if not exists based_on_builtin_hash text;
alter table public.managed_programs add constraint managed_programs_override_identity_check check (
  (source='builtin_override' and builtin_key=stable_key and based_on_builtin_hash is not null)
  or (source<>'builtin_override' and builtin_key is null)
);
create unique index if not exists managed_programs_one_builtin_override on public.managed_programs(builtin_key) where source='builtin_override';

drop policy if exists "admins insert skills" on public.skills;
create policy "admins insert skills" on public.skills for insert with check (
  public.is_admin() and source in ('admin-created','builtin_override') and created_by=auth.uid()
);
drop policy if exists "admins create managed programs" on public.managed_programs;
create policy "admins create managed programs" on public.managed_programs for insert with check (
  public.is_admin() and source in ('admin-created','builtin_override') and created_by=auth.uid()
);

drop function if exists public.save_skill_draft(uuid,text,jsonb,jsonb);
create function public.save_skill_draft(p_skill_id uuid,p_stable_key text,p_definition jsonb,p_validation jsonb,p_builtin_key text default null,p_based_on_builtin_hash text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare s skills; v integer;
begin
 if not public.is_admin() then raise exception 'administrator access required'; end if;
 if p_definition->>'key' is distinct from p_stable_key then raise exception 'definition key mismatch'; end if;
 if p_builtin_key is not null and (p_builtin_key<>p_stable_key or p_based_on_builtin_hash is null) then raise exception 'invalid built-in override identity'; end if;
 if p_skill_id is null then
   insert into skills(stable_key,source,builtin_key,based_on_builtin_hash,created_by,updated_by)
   values(p_stable_key,case when p_builtin_key is null then 'admin-created' else 'builtin_override' end,p_builtin_key,p_based_on_builtin_hash,auth.uid(),auth.uid()) returning * into s;
 else
   select * into s from skills where id=p_skill_id for update;
   if not found or s.source='built-in' then raise exception 'skill is not editable'; end if;
   if s.source='builtin_override' and (p_stable_key<>s.stable_key or p_builtin_key is distinct from s.builtin_key) then raise exception 'built-in override key is immutable'; end if;
   if s.published_version is not null and s.stable_key<>p_stable_key then raise exception 'published stable key is immutable'; end if;
   update skills set stable_key=p_stable_key,updated_by=auth.uid() where id=p_skill_id returning * into s;
 end if;
 v:=case when s.published_version is null then s.draft_version else greatest(s.draft_version,s.published_version+1) end;
 insert into skill_versions(skill_id,version,lifecycle,definition,validation,created_by) values(s.id,v,'draft',p_definition,p_validation,auth.uid()) on conflict(skill_id,version) do update set definition=excluded.definition,validation=excluded.validation;
 update skills set draft_version=v,status=case when coalesce((p_validation->>'valid')::boolean,false) then 'ready' else 'draft' end where id=s.id;
 return s.id;
end $$;

drop function if exists public.save_managed_program_draft(uuid,text,jsonb,jsonb);
create function public.save_managed_program_draft(p_program_id uuid,p_stable_key text,p_definition jsonb,p_validation jsonb,p_builtin_key text default null,p_based_on_builtin_hash text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare p managed_programs; v integer;
begin
 if not public.is_admin() then raise exception 'administrator access required'; end if;
 if p_definition->>'key' is distinct from p_stable_key then raise exception 'definition key mismatch'; end if;
 if p_builtin_key is not null and (p_builtin_key<>p_stable_key or p_based_on_builtin_hash is null) then raise exception 'invalid built-in override identity'; end if;
 if p_program_id is null then
   insert into managed_programs(stable_key,source,builtin_key,based_on_builtin_hash,featured,sort_order,created_by,updated_by)
   values(p_stable_key,case when p_builtin_key is null then 'admin-created' else 'builtin_override' end,p_builtin_key,p_based_on_builtin_hash,coalesce((p_definition->>'featured')::boolean,false),coalesce((p_definition->>'sortOrder')::integer,0),auth.uid(),auth.uid()) returning * into p;
 else
   select * into p from managed_programs where id=p_program_id for update;
   if not found or p.source='built-in' then raise exception 'managed program is not editable'; end if;
   if p.source='builtin_override' and (p_stable_key<>p.stable_key or p_builtin_key is distinct from p.builtin_key) then raise exception 'built-in override key is immutable'; end if;
   if p.published_version is not null and p.stable_key<>p_stable_key then raise exception 'published stable key is immutable'; end if;
   update managed_programs set stable_key=p_stable_key,featured=coalesce((p_definition->>'featured')::boolean,false),sort_order=coalesce((p_definition->>'sortOrder')::integer,0),updated_by=auth.uid() where id=p_program_id returning * into p;
 end if;
 v:=case when p.published_version is null then p.draft_version else greatest(p.draft_version,p.published_version+1) end;
 insert into managed_program_versions(program_id,version,lifecycle,definition,validation,created_by) values(p.id,v,'draft',p_definition,p_validation,auth.uid()) on conflict(program_id,version) do update set definition=excluded.definition,validation=excluded.validation;
 update managed_programs set draft_version=v,status=case when published_version is null then 'draft' else status end where id=p.id;
 return p.id;
end $$;

create or replace function public.set_skill_lifecycle(p_skill_id uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$ begin if not public.is_admin() then raise exception 'administrator access required'; end if; if p_status not in ('unpublished','archived') then raise exception 'invalid lifecycle transition'; end if; update skills set status=p_status,updated_by=auth.uid() where id=p_skill_id and source in ('admin-created','builtin_override'); if not found then raise exception 'skill not found or immutable'; end if; end $$;
create or replace function public.set_managed_program_lifecycle(p_program_id uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$ begin if not public.is_admin() then raise exception 'administrator access required'; end if; if p_status not in ('unpublished','archived') then raise exception 'invalid lifecycle transition'; end if; update managed_programs set status=p_status,updated_by=auth.uid() where id=p_program_id and source in ('admin-created','builtin_override'); if not found then raise exception 'managed program not found'; end if; end $$;

revoke all on function public.save_skill_draft(uuid,text,jsonb,jsonb,text,text) from public;
grant execute on function public.save_skill_draft(uuid,text,jsonb,jsonb,text,text) to authenticated;
revoke all on function public.save_managed_program_draft(uuid,text,jsonb,jsonb,text,text) from public;
grant execute on function public.save_managed_program_draft(uuid,text,jsonb,jsonb,text,text) to authenticated;
