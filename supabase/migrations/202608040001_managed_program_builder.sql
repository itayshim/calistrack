-- Managed Programs are distinct from personal programs and Skills. Published versions are immutable.
create table public.managed_programs (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique check (stable_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  source text not null default 'admin-created' check (source in ('built-in','admin-created')),
  status text not null default 'draft' check (status in ('draft','published','unpublished','archived')),
  draft_version integer not null default 1 check (draft_version > 0),
  published_version integer check (published_version is null or published_version > 0),
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.managed_program_versions (
  id uuid primary key default gen_random_uuid(), program_id uuid not null references public.managed_programs(id) on delete cascade,
  version integer not null check(version>0), lifecycle text not null check(lifecycle in ('draft','published','superseded')),
  schema_version integer not null default 1 check(schema_version=1), definition jsonb not null check(jsonb_typeof(definition)='object'),
  validation jsonb, created_by uuid references auth.users(id), created_at timestamptz not null default now(), published_at timestamptz,
  unique(program_id,version)
);
create table public.managed_program_enrollments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.managed_programs(id), program_version integer not null,
  start_date date not null, current_week_key text not null, status text not null default 'active' check(status in ('active','completed','cancelled')),
  scheduling jsonb not null default '{}'::jsonb, completion jsonb not null default '{}'::jsonb, detached boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(program_id,program_version) references public.managed_program_versions(program_id,version),
  unique(user_id,program_id,program_version,status)
);
create unique index managed_program_one_draft on public.managed_program_versions(program_id) where lifecycle='draft';
create unique index managed_program_one_published on public.managed_program_versions(program_id) where lifecycle='published';
create index managed_program_catalogue_idx on public.managed_programs(status,featured desc,sort_order);
create index managed_program_enrollment_owner_idx on public.managed_program_enrollments(user_id,status);
create trigger managed_programs_touch before update on public.managed_programs for each row execute function public.touch_updated_at();
create trigger managed_program_enrollments_touch before update on public.managed_program_enrollments for each row execute function public.touch_updated_at();
alter table public.managed_programs enable row level security; alter table public.managed_program_versions enable row level security; alter table public.managed_program_enrollments enable row level security;
create or replace function public.owns_managed_program_enrollment(p_program_id uuid,p_version integer default null) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from managed_program_enrollments e where e.user_id=auth.uid() and e.program_id=p_program_id and (p_version is null or e.program_version=p_version)) $$;
revoke all on function public.owns_managed_program_enrollment(uuid,integer) from public; grant execute on function public.owns_managed_program_enrollment(uuid,integer) to authenticated;
create policy "published managed programs readable" on public.managed_programs for select using(status='published' or public.is_admin() or public.owns_managed_program_enrollment(id));
create policy "published managed program versions readable" on public.managed_program_versions for select using(public.is_admin() or (lifecycle='published' and exists(select 1 from public.managed_programs p where p.id=program_id and p.status='published')) or public.owns_managed_program_enrollment(program_id,version));
create policy "admins create managed programs" on public.managed_programs for insert with check(public.is_admin() and source='admin-created' and created_by=auth.uid());
create policy "admins update managed programs" on public.managed_programs for update using(public.is_admin()) with check(public.is_admin());
create policy "admins create managed versions" on public.managed_program_versions for insert with check(public.is_admin() and created_by=auth.uid());
create policy "admins update draft managed versions" on public.managed_program_versions for update using(public.is_admin() and lifecycle='draft') with check(public.is_admin() and lifecycle in ('draft','published'));
create policy "owners read enrollments" on public.managed_program_enrollments for select using(user_id=auth.uid());
create policy "owners create enrollments" on public.managed_program_enrollments for insert with check(user_id=auth.uid() and exists(select 1 from public.managed_program_versions v join public.managed_programs p on p.id=v.program_id where v.program_id=managed_program_enrollments.program_id and v.version=managed_program_enrollments.program_version and v.lifecycle='published' and p.status='published'));
create policy "owners update enrollments" on public.managed_program_enrollments for update using(user_id=auth.uid()) with check(user_id=auth.uid());

create or replace function public.save_managed_program_draft(p_program_id uuid,p_stable_key text,p_definition jsonb,p_validation jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare p managed_programs; v integer;
begin
 if not public.is_admin() then raise exception 'administrator access required'; end if;
 if p_definition->>'key' is distinct from p_stable_key then raise exception 'definition key mismatch'; end if;
 if p_program_id is null then insert into managed_programs(stable_key,featured,sort_order,created_by,updated_by) values(p_stable_key,coalesce((p_definition->>'featured')::boolean,false),coalesce((p_definition->>'sortOrder')::integer,0),auth.uid(),auth.uid()) returning * into p;
 else select * into p from managed_programs where id=p_program_id for update; if not found or p.source='built-in' then raise exception 'managed program is not editable'; end if; if p.published_version is not null and p.stable_key<>p_stable_key then raise exception 'published stable key is immutable'; end if; update managed_programs set stable_key=p_stable_key,featured=coalesce((p_definition->>'featured')::boolean,false),sort_order=coalesce((p_definition->>'sortOrder')::integer,0),updated_by=auth.uid() where id=p_program_id returning * into p; end if;
 v:=case when p.published_version is null then p.draft_version else greatest(p.draft_version,p.published_version+1) end;
 insert into managed_program_versions(program_id,version,lifecycle,definition,validation,created_by) values(p.id,v,'draft',p_definition,p_validation,auth.uid()) on conflict(program_id,version) do update set definition=excluded.definition,validation=excluded.validation;
 update managed_programs set draft_version=v,status=case when published_version is null then 'draft' else status end where id=p.id; return p.id;
end $$;
create or replace function public.publish_managed_program_version(p_program_id uuid) returns integer language plpgsql security definer set search_path=public as $$
declare v integer; ok boolean; begin if not public.is_admin() then raise exception 'administrator access required'; end if; select mv.version,coalesce((mv.validation->>'valid')::boolean,false) into v,ok from managed_program_versions mv join managed_programs p on p.id=mv.program_id and p.draft_version=mv.version where p.id=p_program_id and mv.lifecycle='draft' for update; if not found or not ok then raise exception 'managed program has blocking validation errors'; end if; update managed_program_versions set lifecycle='superseded' where program_id=p_program_id and lifecycle='published'; update managed_program_versions set lifecycle='published',published_at=now() where program_id=p_program_id and version=v; update managed_programs set status='published',published_version=v,draft_version=v+1,updated_by=auth.uid() where id=p_program_id; return v; end $$;
create or replace function public.set_managed_program_lifecycle(p_program_id uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$ begin if not public.is_admin() then raise exception 'administrator access required'; end if; if p_status not in ('unpublished','archived') then raise exception 'invalid lifecycle transition'; end if; update managed_programs set status=p_status,updated_by=auth.uid() where id=p_program_id and source='admin-created'; if not found then raise exception 'managed program not found'; end if; end $$;
revoke all on function public.save_managed_program_draft(uuid,text,jsonb,jsonb) from public; grant execute on function public.save_managed_program_draft(uuid,text,jsonb,jsonb) to authenticated;
revoke all on function public.publish_managed_program_version(uuid) from public; grant execute on function public.publish_managed_program_version(uuid) to authenticated;
revoke all on function public.set_managed_program_lifecycle(uuid,text) from public; grant execute on function public.set_managed_program_lifecycle(uuid,text) to authenticated;
