-- Reversible, administrator-only canonical exercise merges.
-- Source rows and their media remain intact; active redirects make them non-public.
create table public.exercise_merge_audits (
  id uuid primary key default gen_random_uuid(),
  source_exercise_id uuid not null references public.global_exercises(id),
  target_exercise_id uuid not null references public.global_exercises(id),
  source_snapshot jsonb not null,
  target_snapshot jsonb not null,
  dry_run_result jsonb not null,
  execution_result jsonb,
  client_schema_version integer not null,
  rollback_eligible boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  check (source_exercise_id <> target_exercise_id)
);

create table public.exercise_merge_redirects (
  id uuid primary key default gen_random_uuid(),
  source_exercise_id uuid not null references public.global_exercises(id),
  source_stable_key text not null,
  source_runtime_id text not null,
  target_exercise_id uuid not null references public.global_exercises(id),
  target_stable_key text not null,
  target_runtime_id text not null,
  status text not null default 'active' check (status in ('active','rolled_back')),
  audit_id uuid not null references public.exercise_merge_audits(id),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  rolled_back_at timestamptz,
  rolled_back_by uuid references auth.users(id),
  check (source_exercise_id <> target_exercise_id),
  check (source_stable_key <> target_stable_key)
);

create unique index exercise_merge_one_active_source
  on public.exercise_merge_redirects(source_exercise_id) where status = 'active';
create unique index exercise_merge_one_active_source_key
  on public.exercise_merge_redirects(source_stable_key) where status = 'active';
create index exercise_merge_active_target on public.exercise_merge_redirects(target_exercise_id)
  where status = 'active';

alter table public.exercise_merge_audits enable row level security;
alter table public.exercise_merge_redirects enable row level security;
create policy "active exercise redirects are readable" on public.exercise_merge_redirects
  for select using (status = 'active' or public.is_admin());
create policy "exercise merge audits are admin readable" on public.exercise_merge_audits
  for select using (public.is_admin());

create or replace function public.exercise_merge_preview(p_source_id uuid, p_target_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s public.global_exercises; t public.global_exercises; blocking jsonb := '[]'; warnings jsonb := '[]';
declare source_media jsonb; target_media jsonb; result jsonb;
begin
  if not public.is_admin() then raise exception using errcode='42501', message='administrator_required'; end if;
  select * into s from public.global_exercises where id=p_source_id;
  select * into t from public.global_exercises where id=p_target_id;
  if s.id is null then blocking := blocking || '"source_not_found"'::jsonb; end if;
  if t.id is null then blocking := blocking || '"target_not_found"'::jsonb; end if;
  if p_source_id=p_target_id then blocking := blocking || '"self_merge"'::jsonb; end if;
  if s.id is not null and exists(select 1 from public.exercise_merge_redirects where source_exercise_id=s.id and status='active') then blocking := blocking || '"source_already_merged"'::jsonb; end if;
  if s.id is not null and t.id is not null and s.measurement_type<>t.measurement_type then blocking := blocking || '"measurement_mismatch"'::jsonb; end if;
  if s.id is not null and t.id is not null and lower(s.movement_family)<>lower(t.movement_family) then blocking := blocking || '"movement_family_mismatch"'::jsonb; end if;
  if s.id is not null and t.id is not null and (s.category<>t.category or s.difficulty<>t.difficulty) then warnings := warnings || '"metadata_difference"'::jsonb; end if;
  if s.id is not null and exists(
    with recursive chain(id) as (
      select p_target_id union all
      select r.target_exercise_id from public.exercise_merge_redirects r join chain c on r.source_exercise_id=c.id where r.status='active'
    ) select 1 from chain where id=p_source_id
  ) then blocking := blocking || '"merge_cycle"'::jsonb; end if;
  select coalesce(jsonb_agg(to_jsonb(m) order by m.sort_order,m.id),'[]') into source_media from public.exercise_media m where m.exercise_id=p_source_id;
  select coalesce(jsonb_agg(to_jsonb(m) order by m.sort_order,m.id),'[]') into target_media from public.exercise_media m where m.exercise_id=p_target_id;
  result := jsonb_build_object(
    'safe',jsonb_array_length(blocking)=0,'blocking',blocking,'warnings',warnings,
    'source',to_jsonb(s),'target',to_jsonb(t),'sourceMedia',source_media,'targetMedia',target_media,
    'counts',jsonb_build_object(
      'translations',(select count(*) from public.exercise_translations where exercise_id=p_source_id),
      'media',(select count(*) from public.exercise_media where exercise_id=p_source_id),
      'incomingProgressions',(select count(*) from public.global_exercises where easier_exercise_id=p_source_id or harder_exercise_id=p_source_id),
      'managedProgramVersions',(select count(*) from public.managed_program_versions where definition::text like '%'||s.stable_key||'%'),
      'skillVersions',(select count(*) from public.skill_versions where definition::text like '%'||s.stable_key||'%')
    ),
    'visual',jsonb_build_object(
      'source',(select to_jsonb(v) from public.exercise_visuals v where v.stable_key=s.stable_key),
      'target',(select to_jsonb(v) from public.exercise_visuals v where v.stable_key=t.stable_key),
      'policy','target_wins'
    ),
    'policies',jsonb_build_object('canonicalContent','target_wins','aliases','append_unique','media','copy_nonduplicates_target_primary_wins','visual','target_wins')
  );
  return result;
end $$;

create or replace function public.merge_exercises(
  p_source_id uuid, p_target_id uuid, p_expected_target_key text, p_client_schema_version integer
) returns jsonb language plpgsql security definer set search_path = public as $$
declare preview jsonb; s public.global_exercises; t public.global_exercises; audit uuid; copied integer:=0;
begin
  if not public.is_admin() then raise exception using errcode='42501', message='administrator_required'; end if;
  select * into s from public.global_exercises where id=p_source_id for update;
  select * into t from public.global_exercises where id=p_target_id for update;
  preview := public.exercise_merge_preview(p_source_id,p_target_id);
  if not coalesce((preview->>'safe')::boolean,false) then raise exception using errcode='22023',message='exercise_merge_blocked'; end if;
  if t.stable_key<>p_expected_target_key then raise exception using errcode='22023',message='target_confirmation_mismatch'; end if;

  insert into public.exercise_merge_audits(source_exercise_id,target_exercise_id,source_snapshot,target_snapshot,dry_run_result,client_schema_version,created_by)
  values(s.id,t.id,to_jsonb(s),to_jsonb(t),preview,p_client_schema_version,auth.uid()) returning id into audit;

  update public.global_exercises set
    aliases=(select coalesce(jsonb_agg(distinct value),'[]') from jsonb_array_elements(aliases||s.aliases)),
    keywords=(select coalesce(jsonb_agg(distinct value),'[]') from jsonb_array_elements(keywords||s.keywords)),
    updated_by=auth.uid()
  where id=t.id;
  update public.exercise_translations target set
    aliases=(select coalesce(jsonb_agg(distinct value),'[]') from jsonb_array_elements(target.aliases||source.aliases)),
    keywords=(select coalesce(jsonb_agg(distinct value),'[]') from jsonb_array_elements(target.keywords||source.keywords))
  from public.exercise_translations source
  where target.exercise_id=t.id and source.exercise_id=s.id and target.locale=source.locale;

  insert into public.exercise_media(exercise_id,media_type,provider,title,description,external_url,storage_path,thumbnail_url,mime_type,file_size_bytes,sort_order,is_primary,is_published,created_by)
  select t.id,m.media_type,m.provider,m.title,m.description,m.external_url,m.storage_path,m.thumbnail_url,m.mime_type,m.file_size_bytes,
    coalesce((select max(sort_order)+1 from public.exercise_media where exercise_id=t.id),0)+row_number() over(order by m.sort_order,m.id)-1,
    false,m.is_published,auth.uid()
  from public.exercise_media m where m.exercise_id=s.id and not exists(
    select 1 from public.exercise_media existing where existing.exercise_id=t.id and
      ((m.youtube_video_id is not null and existing.youtube_video_id=m.youtube_video_id) or
       (m.youtube_video_id is null and coalesce(existing.storage_path,existing.external_url,'')=coalesce(m.storage_path,m.external_url,'')))
  );
  get diagnostics copied = row_count;
  update public.global_exercises set easier_exercise_id=t.id where easier_exercise_id=s.id and id<>t.id;
  update public.global_exercises set harder_exercise_id=t.id where harder_exercise_id=s.id and id<>t.id;
  update public.global_exercises set is_published=false,updated_by=auth.uid() where id=s.id;

  insert into public.exercise_merge_redirects(source_exercise_id,source_stable_key,source_runtime_id,target_exercise_id,target_stable_key,target_runtime_id,audit_id,created_by)
  values(s.id,s.stable_key,'builtin-'||s.stable_key,t.id,t.stable_key,'builtin-'||t.stable_key,audit,auth.uid());
  update public.exercise_merge_audits set execution_result=jsonb_build_object('copiedMedia',copied,'sourceRetired',true,'redirectCreated',true) where id=audit;
  return jsonb_build_object('auditId',audit,'copiedMedia',copied,'sourceStableKey',s.stable_key,'targetStableKey',t.stable_key);
end $$;

revoke all on function public.exercise_merge_preview(uuid,uuid) from public,anon;
revoke all on function public.merge_exercises(uuid,uuid,text,integer) from public,anon;
grant execute on function public.exercise_merge_preview(uuid,uuid) to authenticated;
grant execute on function public.merge_exercises(uuid,uuid,text,integer) to authenticated;
grant select on public.exercise_merge_redirects to anon,authenticated;
grant select on public.exercise_merge_audits to authenticated;
