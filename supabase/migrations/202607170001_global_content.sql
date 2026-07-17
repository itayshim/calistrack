create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

create table public.global_exercises (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique check (stable_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  movement_family text not null,
  category text not null check (category in ('push','pull','legs','core','mobility','skill')),
  difficulty text not null check (difficulty in ('beginner','intermediate','advanced')),
  measurement_type text not null check (measurement_type in ('reps','time')),
  muscles jsonb not null default '[]'::jsonb check (jsonb_typeof(muscles) = 'array'),
  aliases jsonb not null default '[]'::jsonb check (jsonb_typeof(aliases) = 'array'),
  keywords jsonb not null default '[]'::jsonb check (jsonb_typeof(keywords) = 'array'),
  easier_exercise_id uuid references public.global_exercises(id) on delete set null,
  harder_exercise_id uuid references public.global_exercises(id) on delete set null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table public.exercise_translations (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.global_exercises(id) on delete cascade,
  locale text not null check (locale in ('en','he')),
  name text not null check (length(trim(name)) > 0),
  short_name text,
  description text,
  instructions jsonb not null default '[]'::jsonb check (jsonb_typeof(instructions) = 'array'),
  common_mistakes jsonb not null default '[]'::jsonb check (jsonb_typeof(common_mistakes) = 'array'),
  aliases jsonb not null default '[]'::jsonb check (jsonb_typeof(aliases) = 'array'),
  keywords jsonb not null default '[]'::jsonb check (jsonb_typeof(keywords) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(exercise_id, locale)
);

create table public.exercise_media (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.global_exercises(id) on delete cascade,
  media_type text not null check (media_type in ('youtube','uploaded_video','image','external_link','coaching_note','equipment_note')),
  provider text not null check (provider in ('youtube','supabase_storage','external')),
  title text,
  description text,
  external_url text,
  storage_path text,
  thumbnail_url text,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  check (
    (provider = 'supabase_storage' and storage_path is not null and storage_path like 'exercises/%')
    or (provider <> 'supabase_storage' and external_url is not null)
    or media_type in ('coaching_note','equipment_note')
  )
);

create index global_exercises_family_idx on public.global_exercises(movement_family);
create index global_exercises_published_updated_idx on public.global_exercises(is_published, updated_at desc);
create index exercise_translations_exercise_locale_idx on public.exercise_translations(exercise_id, locale);
create index exercise_media_exercise_published_idx on public.exercise_media(exercise_id, is_published, sort_order);

create function public.is_admin() returns boolean language sql stable security definer
set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger global_exercises_touch before update on public.global_exercises
for each row execute function public.touch_updated_at();
create trigger translations_touch before update on public.exercise_translations
for each row execute function public.touch_updated_at();
create trigger media_touch before update on public.exercise_media
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.global_exercises enable row level security;
alter table public.exercise_translations enable row level security;
alter table public.exercise_media enable row level security;

create policy "users read own profile" on public.profiles for select
using (id = auth.uid() or public.is_admin());

create policy "published exercises are public" on public.global_exercises for select
using (is_published or public.is_admin());
create policy "admins insert exercises" on public.global_exercises for insert
with check (public.is_admin() and created_by = auth.uid());
create policy "admins update exercises" on public.global_exercises for update
using (public.is_admin()) with check (public.is_admin());
create policy "admins delete exercises" on public.global_exercises for delete
using (public.is_admin());

create policy "published translations are public" on public.exercise_translations for select
using (public.is_admin() or exists (
  select 1 from public.global_exercises e where e.id = exercise_id and e.is_published
));
create policy "admins insert translations" on public.exercise_translations for insert
with check (public.is_admin());
create policy "admins update translations" on public.exercise_translations for update
using (public.is_admin()) with check (public.is_admin());
create policy "admins delete translations" on public.exercise_translations for delete
using (public.is_admin());

create policy "published media are public" on public.exercise_media for select
using (public.is_admin() or (is_published and exists (
  select 1 from public.global_exercises e where e.id = exercise_id and e.is_published
)));
create policy "admins insert media" on public.exercise_media for insert
with check (public.is_admin() and created_by = auth.uid());
create policy "admins update media" on public.exercise_media for update
using (public.is_admin()) with check (public.is_admin());
create policy "admins delete media" on public.exercise_media for delete
using (public.is_admin());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-media', 'exercise-media', true, 52428800,
  array['video/mp4','video/quicktime','video/webm','image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public reads exercise media" on storage.objects for select
using (bucket_id = 'exercise-media');
create policy "admins upload exercise media" on storage.objects for insert
with check (
  bucket_id = 'exercise-media'
  and public.is_admin()
  and name ~ '^exercises/[0-9a-f-]{36}/[0-9]+-[a-zA-Z0-9._-]+$'
);
create policy "admins update exercise media" on storage.objects for update
using (bucket_id = 'exercise-media' and public.is_admin())
with check (bucket_id = 'exercise-media' and public.is_admin() and name like 'exercises/%');
create policy "admins delete exercise media" on storage.objects for delete
using (bucket_id = 'exercise-media' and public.is_admin());
