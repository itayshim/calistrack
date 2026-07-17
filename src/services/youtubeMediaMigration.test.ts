import { describe, expect, it } from 'vitest';
import sql from '../../supabase/migrations/202607170006_unique_youtube_media.sql?raw';

describe('YouTube media database integrity migration', () => {
  it('cleans exact duplicates before adding a partial unique index', () => {
    expect(sql.indexOf('delete from public.exercise_media')).toBeLessThan(
      sql.indexOf('create unique index'),
    );
    expect(sql).toContain('partition by exercise_id, youtube_video_id');
    expect(sql).toContain('order by is_primary desc, is_published desc, created_at asc');
    expect(sql).toContain('where media_type = \'youtube\' and youtube_video_id is not null');
  });

  it('provides an administrator-only atomic published insertion', () => {
    expect(sql).toContain('create or replace function public.admin_add_youtube_media');
    expect(sql).toContain('if not public.is_admin()');
    expect(sql).toContain('is_published');
    expect(sql).toContain('true,');
    expect(sql).toContain('on conflict (exercise_id, youtube_video_id)');
    expect(sql).toContain('revoke all on function');
  });
});
