grant select on public.global_exercises to anon, authenticated;
grant select on public.exercise_translations to anon, authenticated;
grant select on public.exercise_media to anon, authenticated;

drop policy if exists "published media are public" on public.exercise_media;
create policy "published media are public"
on public.exercise_media
for select
to anon, authenticated
using (
  is_published
  and exists (
    select 1
    from public.global_exercises exercise
    where exercise.id = exercise_id
      and exercise.is_published
  )
);

drop policy if exists "admins read all media" on public.exercise_media;
create policy "admins read all media"
on public.exercise_media
for select
to authenticated
using (public.is_admin());
