-- Exercise identity visuals are deliberately separate from demonstration media.
create table public.exercise_visuals (
  stable_key text primary key check (stable_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  storage_path text not null check (storage_path ~ '^visuals/[a-z0-9]+(?:-[a-z0-9]+)*/visual\.(svg|webp|png)$'),
  mime_type text not null check (mime_type in ('image/svg+xml', 'image/webp', 'image/png')),
  file_size_bytes bigint not null check (
    file_size_bytes >= 0 and
    ((mime_type = 'image/svg+xml' and file_size_bytes <= 204800) or
     (mime_type = 'image/webp' and file_size_bytes <= 307200) or
     (mime_type = 'image/png' and file_size_bytes <= 512000))
  ),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  view_box text check (view_box is null or length(view_box) <= 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.exercise_visuals enable row level security;
grant select on public.exercise_visuals to anon, authenticated;
create policy "exercise visuals are public" on public.exercise_visuals for select using (true);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-visuals', 'exercise-visuals', true, 512000,
  array['image/svg+xml','image/webp','image/png'])
on conflict (id) do update set public = true, file_size_limit = 512000,
  allowed_mime_types = array['image/svg+xml','image/webp','image/png'];

create policy "public reads exercise visuals" on storage.objects for select
using (bucket_id = 'exercise-visuals');
create policy "admins upload exercise visuals" on storage.objects for insert
with check (bucket_id = 'exercise-visuals' and public.is_admin()
  and name ~ '^visuals/[a-z0-9]+(-[a-z0-9]+)*/visual\.(svg|webp|png)$');
create policy "admins replace exercise visuals" on storage.objects for update
using (bucket_id = 'exercise-visuals' and public.is_admin())
with check (bucket_id = 'exercise-visuals' and public.is_admin()
  and name ~ '^visuals/[a-z0-9]+(-[a-z0-9]+)*/visual\.(svg|webp|png)$');
create policy "admins delete exercise visuals" on storage.objects for delete
using (bucket_id = 'exercise-visuals' and public.is_admin());

create or replace function public.admin_set_exercise_visual(
  p_stable_key text, p_storage_path text, p_mime_type text, p_file_size_bytes bigint,
  p_width integer default null, p_height integer default null, p_view_box text default null
) returns setof public.exercise_visuals
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'administrator required' using errcode = '42501'; end if;
  if p_storage_path <> ('visuals/' || p_stable_key || '/visual.' ||
    case p_mime_type when 'image/svg+xml' then 'svg' when 'image/webp' then 'webp' when 'image/png' then 'png' else 'invalid' end)
  then raise exception 'invalid exercise visual path' using errcode = '22023'; end if;
  return query insert into public.exercise_visuals(stable_key, storage_path, mime_type, file_size_bytes, width, height, view_box, updated_by)
  values (p_stable_key, p_storage_path, p_mime_type, p_file_size_bytes, p_width, p_height, p_view_box, auth.uid())
  on conflict (stable_key) do update set storage_path = excluded.storage_path, mime_type = excluded.mime_type,
    file_size_bytes = excluded.file_size_bytes, width = excluded.width, height = excluded.height,
    view_box = excluded.view_box, updated_at = now(), updated_by = auth.uid()
  returning *;
end $$;

create or replace function public.admin_remove_exercise_visual(p_stable_key text) returns text
language plpgsql security definer set search_path = public as $$
declare removed_path text;
begin
  if not public.is_admin() then raise exception 'administrator required' using errcode = '42501'; end if;
  delete from public.exercise_visuals where stable_key = p_stable_key returning storage_path into removed_path;
  return removed_path;
end $$;

revoke all on function public.admin_set_exercise_visual(text,text,text,bigint,integer,integer,text) from public;
revoke all on function public.admin_remove_exercise_visual(text) from public;
grant execute on function public.admin_set_exercise_visual(text,text,text,bigint,integer,integer,text) to authenticated;
grant execute on function public.admin_remove_exercise_visual(text) to authenticated;
