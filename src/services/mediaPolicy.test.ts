import { describe, expect, it } from 'vitest';
import sql from '../../supabase/migrations/202607170002_published_media_reads.sql?raw';

describe('published media database policy', () => {
  it('grants public reads only for published media belonging to published exercises', () => {
    expect(sql).toContain('grant select on public.exercise_media to anon, authenticated');
    expect(sql).toContain('is_published');
    expect(sql).toContain('exercise.is_published');
    expect(sql).toContain('using (public.is_admin())');
    expect(sql).not.toContain('for insert to anon');
    expect(sql).not.toContain('for update to anon');
    expect(sql).not.toContain('for delete to anon');
  });
});
