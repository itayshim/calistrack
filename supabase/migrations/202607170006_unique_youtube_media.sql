-- Normalize YouTube identities, remove exact duplicates, and make admin insertion atomic.
-- Review/backup before applying in production. Only exact video-ID duplicates are removed.

create or replace function public.youtube_video_id_from_url(value text)
returns text
language plpgsql
immutable
strict
as $$
declare
  matched text[];
begin
  matched := regexp_match(
    value,
    '(?:youtu\.be/|(?:www\.|m\.)?youtube(?:-nocookie)?\.com/(?:watch\?[^#]*[?&]v=|watch\?v=|shorts/|embed/))([A-Za-z0-9_-]{11})',
    'i'
  );
  if matched is null then
    return null;
  end if;
  return matched[1];
end;
$$;

alter table public.exercise_media
  add column if not exists youtube_video_id text;

update public.exercise_media
set youtube_video_id = public.youtube_video_id_from_url(external_url)
where media_type = 'youtube'
  and external_url is not null
  and youtube_video_id is distinct from public.youtube_video_id_from_url(external_url);

-- Keep primary first, then published, then oldest. Preserve a useful title and
-- the earliest ordering value on the retained record.
with ranked as (
  select
    id,
    exercise_id,
    youtube_video_id,
    row_number() over (
      partition by exercise_id, youtube_video_id
      order by is_primary desc, is_published desc, created_at asc, id asc
    ) as duplicate_rank
  from public.exercise_media
  where media_type = 'youtube' and youtube_video_id is not null
),
keepers as (
  select id, exercise_id, youtube_video_id
  from ranked
  where duplicate_rank = 1
),
best_values as (
  select
    keepers.id,
    min(media.sort_order) as sort_order,
    (array_agg(nullif(trim(media.title), '') order by
      media.is_primary desc, media.is_published desc, media.created_at asc
    ) filter (where nullif(trim(media.title), '') is not null))[1] as title
  from keepers
  join public.exercise_media media
    on media.exercise_id = keepers.exercise_id
   and media.youtube_video_id = keepers.youtube_video_id
   and media.media_type = 'youtube'
  group by keepers.id
)
update public.exercise_media media
set
  title = coalesce(nullif(trim(media.title), ''), best_values.title),
  sort_order = best_values.sort_order
from best_values
where media.id = best_values.id;

with ranked as (
  select
    id,
    row_number() over (
      partition by exercise_id, youtube_video_id
      order by is_primary desc, is_published desc, created_at asc, id asc
    ) as duplicate_rank
  from public.exercise_media
  where media_type = 'youtube' and youtube_video_id is not null
)
delete from public.exercise_media media
using ranked
where media.id = ranked.id and ranked.duplicate_rank > 1;

create unique index if not exists exercise_media_unique_youtube_video
  on public.exercise_media(exercise_id, youtube_video_id)
  where media_type = 'youtube' and youtube_video_id is not null;

create or replace function public.set_exercise_media_youtube_id()
returns trigger
language plpgsql
as $$
begin
  if new.media_type = 'youtube' then
    new.youtube_video_id := public.youtube_video_id_from_url(new.external_url);
    if new.youtube_video_id is null then
      raise exception using errcode = '22023', message = 'invalid_youtube_url';
    end if;
  else
    new.youtube_video_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists exercise_media_youtube_identity on public.exercise_media;
create trigger exercise_media_youtube_identity
before insert or update of media_type, external_url
on public.exercise_media
for each row execute function public.set_exercise_media_youtube_id();

create or replace function public.admin_add_youtube_media(
  p_exercise_id uuid,
  p_video_id text,
  p_title text,
  p_sort_order integer default 0
)
returns table(media_id uuid, was_added boolean, is_primary boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
  make_primary boolean;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator_required';
  end if;
  if p_video_id !~ '^[A-Za-z0-9_-]{11}$' then
    raise exception using errcode = '22023', message = 'invalid_youtube_video_id';
  end if;

  select not exists (
    select 1
    from public.exercise_media existing
    where existing.exercise_id = p_exercise_id
      and existing.is_published
  ) into make_primary;

  insert into public.exercise_media (
    exercise_id,
    media_type,
    provider,
    title,
    external_url,
    youtube_video_id,
    sort_order,
    is_primary,
    is_published,
    created_by
  )
  values (
    p_exercise_id,
    'youtube',
    'youtube',
    nullif(trim(p_title), ''),
    'https://www.youtube.com/watch?v=' || p_video_id,
    p_video_id,
    greatest(p_sort_order, 0),
    make_primary,
    true,
    auth.uid()
  )
  on conflict (exercise_id, youtube_video_id)
    where media_type = 'youtube' and youtube_video_id is not null
  do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return query
      select existing.id, false, existing.is_primary
      from public.exercise_media existing
      where existing.exercise_id = p_exercise_id
        and existing.media_type = 'youtube'
        and existing.youtube_video_id = p_video_id
      limit 1;
  else
    return query select inserted_id, true, make_primary;
  end if;
end;
$$;

revoke all on function public.admin_add_youtube_media(uuid, text, text, integer) from public, anon;
grant execute on function public.admin_add_youtube_media(uuid, text, text, integer) to authenticated;
