-- Immutable, versioned Skill definitions. Draft documents remain administrator-only.
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique check (stable_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  source text not null default 'admin-created' check (source in ('built-in','admin-created')),
  status text not null default 'draft' check (status in ('draft','ready','published','unpublished','archived')),
  draft_version integer not null default 1 check (draft_version > 0),
  published_version integer check (published_version is null or published_version > 0),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skill_versions (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  version integer not null check (version > 0),
  lifecycle text not null check (lifecycle in ('draft','published','superseded')),
  schema_version integer not null default 1 check (schema_version = 1),
  definition jsonb not null check (jsonb_typeof(definition) = 'object'),
  validation jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique(skill_id, version)
);

create index skills_status_updated_idx on public.skills(status, updated_at desc);
create index skill_versions_skill_lifecycle_idx on public.skill_versions(skill_id, lifecycle);
create unique index skill_versions_one_draft_idx on public.skill_versions(skill_id) where lifecycle='draft';
create unique index skill_versions_one_published_idx on public.skill_versions(skill_id) where lifecycle='published';
create trigger skills_touch before update on public.skills for each row execute function public.touch_updated_at();

alter table public.skills enable row level security;
alter table public.skill_versions enable row level security;
create policy "published skills are readable" on public.skills for select using (status = 'published' or public.is_admin());
create policy "published skill versions are readable" on public.skill_versions for select using (
  public.is_admin() or (lifecycle = 'published' and exists (select 1 from public.skills s where s.id = skill_id and s.status = 'published'))
);
create policy "admins insert skills" on public.skills for insert with check (public.is_admin() and source = 'admin-created' and created_by = auth.uid());
create policy "admins update skills" on public.skills for update using (public.is_admin()) with check (public.is_admin());
create policy "admins insert skill versions" on public.skill_versions for insert with check (public.is_admin() and created_by = auth.uid());
create policy "admins update draft versions" on public.skill_versions for update using (public.is_admin() and lifecycle = 'draft') with check (public.is_admin() and lifecycle in ('draft','published'));

create or replace function public.save_skill_draft(p_skill_id uuid, p_stable_key text, p_definition jsonb, p_validation jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_skill skills; v_version integer;
begin
  if not public.is_admin() then raise exception 'administrator access required'; end if;
  if p_definition->>'key' is distinct from p_stable_key then raise exception 'definition key mismatch'; end if;
  if p_skill_id is null then
    insert into skills(stable_key, created_by, updated_by) values(p_stable_key, auth.uid(), auth.uid()) returning * into v_skill;
  else
    select * into v_skill from skills where id=p_skill_id for update;
    if not found or v_skill.source='built-in' then raise exception 'skill is not editable'; end if;
    if v_skill.published_version is not null and v_skill.stable_key <> p_stable_key then raise exception 'published stable key is immutable'; end if;
    update skills set stable_key=p_stable_key, updated_by=auth.uid() where id=p_skill_id returning * into v_skill;
  end if;
  v_version := case when v_skill.published_version is null then v_skill.draft_version else greatest(v_skill.draft_version, v_skill.published_version + 1) end;
  insert into skill_versions(skill_id,version,lifecycle,definition,validation,created_by)
  values(v_skill.id,v_version,'draft',p_definition,p_validation,auth.uid())
  on conflict(skill_id,version) do update set definition=excluded.definition, validation=excluded.validation;
  update skills set draft_version=v_version, status=case when coalesce((p_validation->>'valid')::boolean,false) then 'ready' else 'draft' end where id=v_skill.id;
  return v_skill.id;
end $$;

create or replace function public.publish_skill_version(p_skill_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_version integer; v_valid boolean;
begin
  if not public.is_admin() then raise exception 'administrator access required'; end if;
  select sv.version, coalesce((sv.validation->>'valid')::boolean,false) into v_version,v_valid from skill_versions sv join skills s on s.id=sv.skill_id and s.draft_version=sv.version where s.id=p_skill_id and sv.lifecycle='draft' for update;
  if not found or not v_valid then raise exception 'skill has blocking validation errors'; end if;
  update skill_versions set lifecycle='superseded' where skill_id=p_skill_id and lifecycle='published';
  update skill_versions set lifecycle='published', published_at=now() where skill_id=p_skill_id and version=v_version;
  update skills set status='published', published_version=v_version, draft_version=v_version+1, updated_by=auth.uid() where id=p_skill_id;
  return v_version;
end $$;

create or replace function public.set_skill_lifecycle(p_skill_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'administrator access required'; end if;
  if p_status not in ('unpublished','archived') then raise exception 'invalid lifecycle transition'; end if;
  update skills set status=p_status, updated_by=auth.uid() where id=p_skill_id and source='admin-created';
  if not found then raise exception 'skill not found or immutable'; end if;
end $$;

revoke all on function public.save_skill_draft(uuid,text,jsonb,jsonb) from public;
revoke all on function public.publish_skill_version(uuid) from public;
grant execute on function public.save_skill_draft(uuid,text,jsonb,jsonb) to authenticated;
grant execute on function public.publish_skill_version(uuid) to authenticated;
revoke all on function public.set_skill_lifecycle(uuid,text) from public;
grant execute on function public.set_skill_lifecycle(uuid,text) to authenticated;
